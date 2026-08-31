from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"

core = CORE.read_text()

old = '''      if (\n        sourceBelongsToEmbeddedModule(\n          moduleConstructor,\n          moduleSource\n        ) ||\n        (\n          nativeRuntimeExpected &&\n          matchesAmbientNativeConstructor(\n            moduleConstructor,\n            constructorName\n          )\n        )\n      ) {\n        return moduleConstructor;\n      }'''

new = '''      if (\n        sourceBelongsToEmbeddedModule(\n          moduleConstructor,\n          moduleSource\n        ) ||\n        (\n          constructorName === "Blob" &&\n          nodeMajorVersion >= 24 &&\n          (() => {\n            const prototype =\n              captureConstructorPrototype(\n                moduleConstructor\n              );\n\n            if (prototype === null) {\n              return false;\n            }\n\n            let prototypeConstructorDescriptor;\n            let sliceDescriptor;\n\n            try {\n              prototypeConstructorDescriptor =\n                getOwnPropertyDescriptor(\n                  prototype,\n                  "constructor"\n                );\n              sliceDescriptor =\n                getOwnPropertyDescriptor(\n                  prototype,\n                  "slice"\n                );\n            } catch {\n              return false;\n            }\n\n            return (\n              prototypeConstructorDescriptor !==\n                undefined &&\n              "value" in\n                prototypeConstructorDescriptor &&\n              prototypeConstructorDescriptor.value ===\n                moduleConstructor &&\n              sliceDescriptor !== undefined &&\n              "value" in sliceDescriptor &&\n              typeof sliceDescriptor.value ===\n                "function" &&\n              !utilTypePredicates.isProxy(\n                sliceDescriptor.value\n              ) &&\n              sourceBelongsToEmbeddedModule(\n                sliceDescriptor.value,\n                moduleSource\n              )\n            );\n          })()\n        ) ||\n        (\n          nativeRuntimeExpected &&\n          matchesAmbientNativeConstructor(\n            moduleConstructor,\n            constructorName\n          )\n        )\n      ) {\n        return moduleConstructor;\n      }'''

count = core.count(old)
if count != 1:
    raise SystemExit(
        f"expected one module constructor trust seam, found {count}"
    )

core = core.replace(old, new, 1)
CORE.write_text(core)
print("added Node 24 Blob module-brand authority fallback")
