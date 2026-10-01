"""Sonda de viabilidad de GRPO con LoRA en CPU sobre un modelo local.

Mide, sin GPU, cuánto cuesta un paso de GRPO: segundos por paso, memoria
residente máxima y la recompensa media antes y después de los pasos. La
recompensa es verificable: la suite de llamadas a herramientas del benchmark
de modelos locales (una llamada exacta vale 1, el nombre correcto con
argumentos distintos 0.5, cualquier otra salida 0; el caso sin herramienta
vale 1 si no se llama ninguna).
"""
import json
import re
import resource
import sys
import time

import torch
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import GRPOConfig, GRPOTrainer

TOOL_CALL_PATTERN = re.compile(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", re.S)
EXACT_CALL_REWARD = 1.0
NAME_ONLY_REWARD = 0.5

WEATHER = {"type": "function", "function": {"name": "get_weather", "description": "Return the current weather for a city.",
           "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}}
ADD = {"type": "function", "function": {"name": "add", "description": "Add two integers.",
       "parameters": {"type": "object", "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}}, "required": ["a", "b"]}}}
READ_FILE = {"type": "function", "function": {"name": "read_file", "description": "Read the contents of one file.",
             "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}}
LIST_DIR = {"type": "function", "function": {"name": "list_dir", "description": "List the entries of a directory.",
            "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}}
SET_MODE = {"type": "function", "function": {"name": "set_mode", "description": "Set the operating mode.",
            "parameters": {"type": "object", "properties": {"mode": {"type": "string", "enum": ["fast", "safe", "off"]}}, "required": ["mode"]}}}

CASES = [
    ("What is the weather in Madrid right now?", [WEATHER], {"name": "get_weather", "arguments": {"city": "Madrid"}}),
    ("Use the tool to add 17 and 25.", [ADD], {"name": "add", "arguments": {"a": 17, "b": 25}}),
    ("Show me the contents of the file /etc/hostname.", [LIST_DIR, READ_FILE], {"name": "read_file", "arguments": {"path": "/etc/hostname"}}),
    ("Switch the operating mode to safe.", [SET_MODE], {"name": "set_mode", "arguments": {"mode": "safe"}}),
    ("Reply with the single word: hello", [WEATHER], None),
]


def first_tool_call(text: str) -> dict | None:
    match = TOOL_CALL_PATTERN.search(text)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}


def case_reward(completion: str, expected: dict | None) -> float:
    observed = first_tool_call(completion)
    if expected is None:
        return EXACT_CALL_REWARD if observed is None else 0.0
    if observed == expected:
        return EXACT_CALL_REWARD
    if isinstance(observed, dict) and observed.get("name") == expected["name"]:
        return NAME_ONLY_REWARD
    return 0.0


def tool_call_reward(completions: list[str], expected: list[str], **_: object) -> list[float]:
    return [case_reward(text, json.loads(target)) for text, target in zip(completions, expected)]


def build_dataset(tokenizer: AutoTokenizer) -> Dataset:
    rows = [{"prompt": tokenizer.apply_chat_template([{"role": "user", "content": prompt}], tools=tools,
                                                      tokenize=False, add_generation_prompt=True),
             "expected": json.dumps(target)} for prompt, tools, target in CASES]
    return Dataset.from_list(rows)


def mean_reward(model, tokenizer, dataset: Dataset, max_new_tokens: int) -> float:
    rewards = []
    for row in dataset:
        inputs = tokenizer(row["prompt"], return_tensors="pt")
        with torch.no_grad():
            output = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
        text = tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=False)
        rewards.append(case_reward(text, json.loads(row["expected"])))
    return sum(rewards) / len(rewards)


def peak_rss_mib() -> float:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def main(argv: list[str]) -> int:
    model_dir, output_dir, steps, group_size = argv[0], argv[1], int(argv[2]), int(argv[3])
    torch.set_num_threads(torch.get_num_threads())
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForCausalLM.from_pretrained(model_dir, torch_dtype=torch.float32)
    dataset = build_dataset(tokenizer)
    max_new_tokens = 64
    started = time.monotonic()
    before = mean_reward(model, tokenizer, dataset, max_new_tokens)
    baseline_seconds = time.monotonic() - started
    config = GRPOConfig(output_dir=output_dir, max_steps=steps, per_device_train_batch_size=group_size,
                        num_generations=group_size, max_completion_length=max_new_tokens, max_prompt_length=512,
                        learning_rate=1e-5, logging_steps=1, use_cpu=True, bf16=False, report_to=[],
                        save_strategy="no", gradient_checkpointing=True)
    lora = LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"], task_type="CAUSAL_LM")
    trainer = GRPOTrainer(model=model, reward_funcs=tool_call_reward, args=config, train_dataset=dataset,
                          processing_class=tokenizer, peft_config=lora)
    started = time.monotonic()
    trainer.train()
    train_seconds = time.monotonic() - started
    after = mean_reward(trainer.model, tokenizer, dataset, max_new_tokens)
    print(json.dumps({"threads": torch.get_num_threads(), "steps": steps, "group_size": group_size,
                      "seconds_per_step": round(train_seconds / steps, 1), "baseline_eval_seconds": round(baseline_seconds, 1),
                      "reward_before": before, "reward_after": after, "peak_rss_mib": round(peak_rss_mib()),
                      "log": trainer.state.log_history}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
