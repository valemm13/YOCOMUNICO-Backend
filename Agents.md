# AGENTS.md — Sistema de Comunicación y Monitoreo UCI (Nodos Binarios)

Este documento define las reglas de negocio, la arquitectura técnica, las directrices del desarrollador/agente de IA y los modelos de datos para el desarrollo del backend en **NestJS**. El sistema facilita la comunicación asistida para pacientes intubados en UCI mediante interfaces binarias (2 botones/proyector) y sincronización en tiempo real con la aplicación médica.

---

## 1. Contexto Clínico y Principios UX del Paciente

Los pacientes intubados o críticos en UCI experimentan ansiedad, dolor no comunicado, asfixia, fatiga extrema y falta de control motor fino. El sistema se rige bajo el principio de **cero carga cognitiva y mínimo esfuerzo físico**:
* **Interfaz Proyectada:** Muestra únicamente 2 secciones visuales a la vez (Pantalla Dividida / Botón Izquierdo y Derecho).
* **Navegación Binaria:** Cada selección descarta la mitad no elegida y profundiza en el árbol hasta alcanzar un síntoma o mensaje específico (nodo hoja).
* **Trazabilidad y Alertas:** Al alcanzar un nodo hoja o presionar la llamada de emergencia, la información se persiste en el expediente digital del paciente y se transmite inmediatamente a la central y app médica.

---

## 2. Arbol de Decisión Binario (Escenarios y Niveles)

La navegación binaria clasifica sistemáticamente las necesidades y síntomas en 2 grandes universos iniciales:

### Nivel 0 (Raíz Inicial)
1. **Sección A:** Dolor y Necesidades Físicas.
2. **Sección B:** Estado Emocional y Mensajes.

### Nivel 1 (Sub-ramas Principales)
* **Si elige Sección A (Físico / Dolor):**
  * `A1`: Dolor Corporal / Malestar de Dispositivos (Sonda, Tubo, Cánula).
  * `A2`: Necesidades Fisiológicas y Confort del Entorno (Sed, Posición, Temperatura).
* **Si elige Sección B (Emoción / Comunicación):**
  * `B1`: Estado Emocional (Miedo, Ansiedad, Tristeza, Calma).
  * `B2`: Mensajes Rápidos / Petición a Familia o Equipo Médico.

### Nivel 2 y 3 (Desglose Binario Específico)
* **Desde A1 (Dolor / Malestar):**
  * *Nivel A1.1:* Dolor Físico Localizado vs. Molestia por Tubo/Dispositivo.
  * *Nivel A1.1.1 (Dolor Físico):* Cabeza/Torso vs. Extremidades/Abdomen.
    * *A1.1.1.1 (Hoja):* Dolor Punzante Agudo (Dispara Alerta).
    * *A1.1.1.2 (Hoja):* Dolor Sordo / Constante.
  * *Nivel A1.1.2 (Dispositivos):* Tubo Endotraqueal / Garganta vs. Sonda / Vía Venosa.
* **Desde A2 (Necesidades Fisiológicas):**
  * *Nivel A2.1:* Sed / Boca Seca vs. Ajuste de Cama / Posición.
  * *Nivel A2.2:* Frío / Calor vs. Falta de Aire / Asfixia (*Nivel Crítico de Emergencia*).
* **Desde B1 (Emociones):**
  * *Nivel B1.1:* Ansiedad / Miedo / Pánico vs. Tristeza / Frustración.
  * *Nivel B1.2:* Deseo de Ver a la Familia vs. Necesidad de Explicación Médica.
* **Desde B2 (Mensajes Rápidos):**
  * *Nivel B2.1:* "Quiero Descansar / Solicitud de Silencio" vs. "¿Cuánto falta para el procedimiento?".

---

## 3. Directrices y Reglas para el Agente / Desarrollador

1. **Respuestas Livianas (Payload Binario):**
   * Toda respuesta enviada al microproyector/dispositivo IoT debe devolver **únicamente dos nodos hijos** (`leftNode`, `rightNode`) para mantener el procesamiento en hardware de bajo consumo al mínimo.
2. **Alertas de Emergencia e Interrupción:**
   * Si la selección del paciente llega a un nodo crítico (ej. "Dificultad para respirar") o el hardware envía un evento directo de pánico, el backend debe ignorar la profundidad del árbol y disparar una notificación de prioridad máxima vía WebSockets.
3. **Persistencia Auditada:**
   * Cada pulsación de botón debe registrarse con ID de paciente, ID del nodo y marca de tiempo (`timestamp`), garantizando la trazabilidad histórica durante los cambios de turno médico.
4. **Arquitectura Modular en NestJS:**
   * Respetar la separación de responsabilidades: Controladores, Servicios, Entidades DTOs validados con `class-validator`, y Módulos independientes por dominio contextualmente definidos.
5. **Acceso Multipartidario en la Nube:**
   * La vista de tabla/Excel del médico debe actualizarse en tiempo real mediante WebSockets (`@nestjs/websockets`) o SSE cuando se seleccione una hoja del árbol o se agreguen observaciones clínicas.

---

## 4. Arquitectura de Tecnologías y Estructura del Backend

### Stack Tecnológico
* **Framework Backend:** NestJS (Node.js / TypeScript)
* **Base de Datos Principal:** PostgreSQL (Entidades de Pacientes, Nodos del Árbol y Historial Clínico)
* **Almacenamiento en Caché:** Redis (Caché de estructura del árbol binario y sesiones activas de dispositivos)
* **Real-time / Eventos:** WebSockets (`@nestjs/websockets`) para comunicación bidireccional en tiempo real con la app médica.
* **ORM:** TypeORM / Prisma ORM.

### Estructura de Directorios NestJS (`Superproyecto/backend`)

```text
backend/
├── dist/
├── node_modules/
├── src/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interfaces/
│   ├── config/
│   │   └── database.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── patients/
│   │   │   ├── dto/
│   │   │   ├── entities/patient.entity.ts
│   │   │   ├── patients.controller.ts
│   │   │   ├── patients.service.ts
│   │   │   └── patients.module.ts
│   │   ├── binary-tree/
│   │   │   ├── dto/
│   │   │   ├── entities/tree-node.entity.ts
│   │   │   ├── binary-tree.controller.ts
│   │   │   ├── binary-tree.service.ts
│   │   │   └── binary-tree.module.ts
│   │   ├── clinical-records/
│   │   │   ├── dto/
│   │   │   ├── entities/clinical-record.entity.ts
│   │   │   ├── clinical-records.controller.ts
│   │   │   ├── clinical-records.service.ts
│   │   │   └── clinical-records.module.ts
│   │   ├── emergency/
│   │   │   ├── emergency.gateway.ts
│   │   │   ├── emergency.service.ts
│   │   │   └── emergency.module.ts
│   │   └── sync/
│   │       ├── sync.controller.ts
│   │       ├── sync.service.ts
│   │       └── sync.module.ts
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── Agents.md
├── nest-cli.json
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
└── tsconfig.build.json