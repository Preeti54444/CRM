import runpy
import traceback

try:
    runpy.run_path('scripts/seed_admin.py', run_name='__main__')
    print('Seed script executed without uncaught exceptions')
except Exception as e:
    print('Seed script raised an exception:')
    traceback.print_exc()
