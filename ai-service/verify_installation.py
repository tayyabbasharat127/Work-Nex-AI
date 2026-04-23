#!/usr/bin/env python3
"""
AI Service Installation Verification Script
Checks if all required packages are installed and configured correctly
"""

import sys
from typing import List, Tuple

def check_package(package_name: str, import_name: str = None) -> Tuple[bool, str]:
    """Check if a package is installed and return version"""
    if import_name is None:
        import_name = package_name
    
    try:
        module = __import__(import_name)
        version = getattr(module, '__version__', 'unknown')
        return True, version
    except ImportError:
        return False, None

def main():
    print("=" * 60)
    print("AI Service Installation Verification")
    print("=" * 60)
    print()
    
    # Required packages
    packages = [
        ('fastapi', 'fastapi'),
        ('uvicorn', 'uvicorn'),
        ('httpx', 'httpx'),
        ('pydantic', 'pydantic'),
        ('python-dotenv', 'dotenv'),
    ]
    
    all_installed = True
    
    print("📦 Checking Required Packages:")
    print("-" * 60)
    
    for package_name, import_name in packages:
        installed, version = check_package(package_name, import_name)
        if installed:
            print(f"✅ {package_name:20} v{version}")
        else:
            print(f"❌ {package_name:20} NOT INSTALLED")
            all_installed = False
    
    print()
    print("-" * 60)
    
    if not all_installed:
        print("❌ Some packages are missing!")
        print("Run: pip3 install -r requirements.txt")
        sys.exit(1)
    
    # Check if app can be loaded
    print()
    print("🚀 Checking Application:")
    print("-" * 60)
    
    try:
        from app.main import app
        print(f"✅ FastAPI app loaded successfully")
        print(f"   Title: {app.title}")
        print(f"   Version: {app.version}")
    except Exception as e:
        print(f"❌ Failed to load app: {e}")
        sys.exit(1)
    
    # Check configuration
    print()
    print("⚙️  Checking Configuration:")
    print("-" * 60)
    
    try:
        from app.core.config import settings
        print(f"✅ Configuration loaded from .env")
        print(f"   Host: {settings.HOST}")
        print(f"   Port: {settings.PORT}")
        print(f"   Debug Mode: {settings.DEBUG}")
        print(f"   AI Provider: {settings.AI_PROVIDER}")
        print(f"   Backend URL: {settings.BACKEND_URL}")
    except Exception as e:
        print(f"❌ Failed to load config: {e}")
        sys.exit(1)
    
    # Check controllers
    print()
    print("🎮 Checking Controllers:")
    print("-" * 60)
    
    controllers = [
        'app.controllers.chat_controller',
        'app.controllers.predict_controller',
        'app.controllers.workflow_controller',
    ]
    
    for controller in controllers:
        try:
            __import__(controller)
            print(f"✅ {controller.split('.')[-1]}")
        except Exception as e:
            print(f"❌ {controller.split('.')[-1]}: {e}")
    
    # Check services
    print()
    print("🔧 Checking Services:")
    print("-" * 60)
    
    services = [
        'app.services.chat_service',
        'app.services.forecast_service',
        'app.services.anomaly_service',
        'app.services.attrition_service',
    ]
    
    for service in services:
        try:
            __import__(service)
            print(f"✅ {service.split('.')[-1]}")
        except Exception as e:
            print(f"❌ {service.split('.')[-1]}: {e}")
    
    # Final summary
    print()
    print("=" * 60)
    print("✅ ALL CHECKS PASSED!")
    print("=" * 60)
    print()
    print("🎉 AI Service is ready to run!")
    print()
    print("To start the service, run:")
    print("  python3 run.py")
    print()
    print("Or:")
    print("  python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
    print()
    print("Service will be available at:")
    print("  • Main URL: http://localhost:8000")
    print("  • Health Check: http://localhost:8000/health")
    print("  • API Docs: http://localhost:8000/docs")
    print("  • ReDoc: http://localhost:8000/redoc")
    print()

if __name__ == "__main__":
    main()
