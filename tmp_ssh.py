import paramiko
import sys
import time

try:
    print("Conectando a SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Asumiendo que el key está en ~/.ssh/id_ed25519
    key = paramiko.Ed25519Key.from_private_key_file("C:/Users/Nahuel Jiménez/.ssh/id_ed25519", password="Nahuel1.")
    
    client.connect('187.77.29.215', username='root', pkey=key)
    print("Conexión exitosa, ejecutando comando...")

    # Forzar recreación del contenedor y ejecutar consulta
    cmd = """
    cd /root/DegaderSocialBackV2
    docker-compose restart backend > /dev/null 2>&1
    sleep 3
    docker exec degadersocialbackv2-backend-1 curl -s http://localhost:5000/api/test-audit
    """
    
    stdin, stdout, stderr = client.exec_command(cmd)
    
    result = stdout.read().decode()
    err = stderr.read().decode()
    
    if result:
        with open("final_db_dump.json", "w", encoding="utf-8") as f:
            f.write(result)
        print("✅ Resultado guardado en final_db_dump.json")
    if err:
        print("⚠️ Errores de SSH:", err)
        
    client.close()
except Exception as e:
    print("❌ Fallo en Python:", e)
