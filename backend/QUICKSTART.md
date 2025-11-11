# Quick Start - Backend GraphQL

## 🚀 Inicio Rápido

**IMPORTANTE**: Todos los comandos deben ejecutarse desde el directorio `backend/`

### Opción 1: Usar el script (Recomendado)

**Linux/macOS:**
```bash
cd backend
./run.sh
```

**Windows:**
```bash
cd backend
run.bat
```

### Opción 2: Comando manual

**Linux/macOS:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Windows:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Opción 3: Python directo

**Desde el directorio raíz del proyecto:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m app.main
```

## 🌐 URLs Disponibles

Una vez iniciado el servidor:

- **API Root**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **GraphQL Playground**: http://localhost:8000/graphql

## 🧪 Probar el API

### En el GraphQL Playground

Abre http://localhost:8000/graphql en tu navegador y prueba esta query:

```graphql
query {
  hello
}
```

Deberías ver:

```json
{
  "data": {
    "hello": "Hello from Digital Twin GraphQL API!"
  }
}
```

### Usando curl

```bash
curl -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'
```

## 📝 Notas

- El servidor se recarga automáticamente cuando detecta cambios en el código
- MongoDB debe estar ejecutándose en `localhost:27017`
- Los logs del servidor aparecen en la terminal

## 🛑 Detener el Servidor

Presiona `Ctrl + C` en la terminal donde está corriendo el servidor.
