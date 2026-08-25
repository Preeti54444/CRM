import importlib.util
import sys
print(sys.path[0])
for mod in ['app.models.lead_duplicate_log', 'app.services.performance_service']:
    spec = importlib.util.find_spec(mod)
    print(mod, '->', spec.origin if spec else None)
