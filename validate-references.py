#!/usr/bin/env python3
"""
THYROX Reference Validator v2
Valida que todas las referencias a archivos en documentos existan realmente.
Ignora placeholders y referencias documentales.

Uso:
    python3 validate-references.py              # Valida desde directorio actual
    python3 validate-references.py /path        # Valida desde ruta específica
    python3 validate-references.py --verbose    # Modo verbose (muestra referencias OK)
    python3 validate-references.py --stats      # Solo estadísticas
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict

class ReferenceValidator:
    """Valida referencias a archivos en documentación THYROX"""
    
    PLACEHOLDERS = {
        'YYYY-MM-DD', 'HH-MM', 'HH:MM', 'TIMESTAMP', 'NNN', 'XXX', 
        'NOMBRE', 'PROYECTO', 'DESCRIPCION', 'PATH',
        'nombre-proyecto', 'proyecto-x', 'feature-x', 'proyecto',
        'PHASE', 'TASK', 'STEP', 'TASK-NNN', 'SPEC-NNN',
        'archivo', 'directorio', 'referencia', '*', '...', 'YYYY'
    }
    
    def __init__(self, root_path=".", verbose=False):
        self.root_path = Path(root_path).resolve()
        self.verbose = verbose
        self.files_found = {}
        self.references = defaultdict(list)
        self.broken_refs = []
        self.valid_refs = []
        self.ignored_refs = []
        
    def is_placeholder(self, ref):
        """Detecta si una referencia es un placeholder/ejemplo"""
        upper_ref = ref.upper()
        
        for placeholder in self.PLACEHOLDERS:
            if placeholder in upper_ref:
                return True
        
        return False
    
    def find_all_files(self):
        """Encuentra todos los archivos MD relevantes"""
        print("Escaneando archivos...")
        count = 0
        
        for root, dirs, files in os.walk(self.root_path):
            # Ignorar directorios comunes
            dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '.venv', '__pycache__'}]
            
            for file in files:
                if file.endswith(('.md', '.json')) and not file.startswith('.'):
                    full_path = Path(root) / file
                    rel_path = full_path.relative_to(self.root_path)
                    self.files_found[str(rel_path)] = full_path
                    count += 1
        
        print(f"  Encontrados: {count} archivos\n")
    
    def extract_references(self, content):
        """Extrae referencias REALES (no placeholders)"""
        refs = []
        
        # Patrón 1: Links Markdown [texto](ruta/archivo.md)
        # Solo archivos reales con extensión
        markdown_links = re.findall(r'\[([^\]]+)\]\(([^)]+\.(?:md|txt|template))\)', content)
        for text, path in markdown_links:
            if not path.startswith('http') and not self.is_placeholder(path):
                refs.append(('markdown', path))
        
        # Patrón 2: Referencias a archivos con extensión
        # Buscar: cualquier/ruta/archivo.extension
        file_refs = re.findall(
            r'\.?\.?/?[a-zA-Z0-9._/-]*\.(?:md|template|json|txt)',
            content
        )
        for ref in file_refs:
            if (not ref.startswith('http') and 
                not self.is_placeholder(ref) and
                ref.strip() and
                not ref.startswith('///') and
                ref not in [r[1] for r in refs]):
                refs.append(('file', ref))
        
        return list(set(refs))  # Eliminar duplicados
    
    def resolve_reference(self, ref, source_file):
        """Resuelve una referencia a ruta absoluta"""
        source_dir = Path(source_file).parent
        
        # Limpiar la referencia
        ref = ref.strip()
        
        # Si empieza con ./ o ../, es relativa
        if ref.startswith('./') or ref.startswith('../'):
            target = (source_dir / ref).resolve()
        # Si no empieza con /, es relativa al directorio del archivo
        elif not ref.startswith('/'):
            target = (source_dir / ref).resolve()
        # Si empieza con /, es absoluta desde raíz
        else:
            target = self.root_path / ref.lstrip('/')
        
        return target
    
    def validate_all_files(self):
        """Valida referencias en todos los archivos MD"""
        print("Validando referencias...\n")
        
        for rel_path, file_path in sorted(self.files_found.items()):
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception as e:
                print(f"ERROR: No se puede leer {file_path}: {e}")
                continue
            
            refs = self.extract_references(content)
            
            for ref_type, ref_path in refs:
                self.references[rel_path].append((ref_type, ref_path))
                
                try:
                    resolved = self.resolve_reference(ref_path, file_path)
                    
                    if resolved.exists():
                        self.valid_refs.append((rel_path, ref_path))
                        if self.verbose:
                            file_name = Path(rel_path).name
                            print(f"  ✓ {file_name:40} → {ref_path}")
                    else:
                        self.broken_refs.append((rel_path, ref_path, f"No existe"))
                        file_name = Path(rel_path).name
                        print(f"  ✗ {file_name:40} → {ref_path}")
                
                except Exception as e:
                    self.broken_refs.append((rel_path, ref_path, str(e)))
                    file_name = Path(rel_path).name
                    print(f"  ! {file_name:40} → {ref_path} ({type(e).__name__})")
    
    def print_summary(self):
        """Imprime resumen de validación"""
        print("\n" + "="*80)
        print("RESUMEN DE VALIDACIÓN DE REFERENCIAS - THYROX")
        print("="*80 + "\n")
        
        total_refs = len(self.valid_refs) + len(self.broken_refs)
        valid_count = len(self.valid_refs)
        broken_count = len(self.broken_refs)
        
        if total_refs == 0:
            print("No se encontraron referencias.\n")
            return True
        
        print(f"Total referencias validadas: {total_refs}")
        print(f"  ✓ Válidas:                  {valid_count}")
        print(f"  ✗ Rotas:                    {broken_count}")
        
        if total_refs > 0:
            success_rate = (valid_count / total_refs) * 100
            print(f"\nTasa de éxito: {success_rate:.1f}%")
            
            if success_rate == 100:
                print("Status: ✓ TODAS LAS REFERENCIAS SON VÁLIDAS\n")
            elif success_rate >= 95:
                print("Status: ✓ EXCELENTE (>95% válidas)\n")
            elif success_rate >= 85:
                print("Status: ~ BUENO (85-95% válidas)\n")
            else:
                print("Status: ✗ REQUIERE ATENCIÓN (<85% válidas)\n")
        
        # Archivos analizados
        files_with_refs = sum(1 for refs in self.references.values() if refs)
        print(f"Archivos analizados: {files_with_refs} con referencias\n")
        
        # Top archivos con referencias
        if self.references:
            top_files = sorted(
                [(f, len(refs)) for f, refs in self.references.items() if refs],
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            if top_files:
                print("Archivos con más referencias:")
                for file, count in top_files:
                    file_name = Path(file).name
                    print(f"  • {file_name:45} {count} referencias")
                print()
        
        # Detalle de referencias rotas (si las hay)
        if self.broken_refs:
            print("-"*80)
            print("REFERENCIAS ROTAS (ACCIÓN REQUERIDA):")
            print("-"*80 + "\n")
            
            broken_by_file = defaultdict(list)
            for file, ref, error in self.broken_refs:
                broken_by_file[file].append((ref, error))
            
            for file in sorted(broken_by_file.keys()):
                print(f"{Path(file).name}:")
                for ref, error in broken_by_file[file]:
                    print(f"  ✗ {ref}")
                print()
        
        print("="*80 + "\n")
        
        return broken_count == 0
    
    def export_report(self, output_file="reference-validation-report.txt"):
        """Exporta reporte a archivo"""
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("="*80 + "\n")
            f.write("THYROX - REPORTE DE VALIDACIÓN DE REFERENCIAS\n")
            f.write("="*80 + "\n\n")
            
            total = len(self.valid_refs) + len(self.broken_refs)
            f.write(f"ESTADÍSTICAS\n")
            f.write("-"*80 + "\n")
            f.write(f"Total referencias: {total}\n")
            f.write(f"Válidas: {len(self.valid_refs)}\n")
            f.write(f"Rotas: {len(self.broken_refs)}\n")
            
            if total > 0:
                success_rate = (len(self.valid_refs) / total) * 100
                f.write(f"Tasa de éxito: {success_rate:.1f}%\n\n")
            
            if self.broken_refs:
                f.write("REFERENCIAS ROTAS\n")
                f.write("-"*80 + "\n")
                for file, ref, error in sorted(self.broken_refs):
                    f.write(f"\nArchivo: {file}\n")
                    f.write(f"  Referencia: {ref}\n")
                    f.write(f"  Error: {error}\n")
                f.write("\n")
            else:
                f.write("\nNO HAY REFERENCIAS ROTAS\n")
            
            f.write("="*80 + "\n")
        
        return output_file

def main():
    """Punto de entrada principal"""
    # Parse argumentos
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    stats_only = '--stats' in sys.argv
    root_path = '.'
    
    for arg in sys.argv[1:]:
        if not arg.startswith('-') and Path(arg).exists():
            root_path = arg
            break
    
    # Ejecutar validación
    validator = ReferenceValidator(root_path=root_path, verbose=verbose)
    validator.find_all_files()
    validator.validate_all_files()
    
    success = validator.print_summary()
    
    # Exportar reporte
    report_file = validator.export_report()
    print(f"Reporte guardado en: {report_file}\n")
    
    # Exit code
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
