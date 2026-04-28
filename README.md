<div align="center">
  
  # 🚀 Orbit Dash 🚀

  *A high-performance, modern lead management system (CRM) built for speed and precision.*

  <br />

  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />

</div>

<br />

> **Project Status:** 🚧 Under Development (Implementing Lead Management)

---

## 🎯 About Orbit Dash

**Orbit Dash** is a streamlined CRM designed to put your customers at the center of the universe. Built with a focus on developer experience and business security, it utilizes a robust Python backend and a reactive TypeScript frontend to manage sales pipelines effectively.

---

## 🏗️ Project Architecture

```text
📦 Orbit-Dash
 ┣ 📂 back-end              # ⚙️ Python FastAPI Engine
 ┃ ┣ 📂 src                 # Routes, Auth, and Business Logic
 ┃ ┗ 📜 Dockerfile          # Backend Containerization
 ┣ 📂 front-end             # 💻 React + Tailwind SPA
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 pages             # Dashboard, Login, Register
 ┃ ┃ ┗ 📂 store             # State Management (Zustand)
 ┃ ┗ 📜 Dockerfile          # Frontend Containerization
 ┗ 🐋 docker-compose.yml    # Full Stack Orchestration
```

 # 🚀 Getting Started
 
## 🐳 Docker Setup (Recommended)

The fastest way to get Orbit Dash up and running is using Docker. This ensures the Database, Backend, and Frontend are perfectly synced.

Clone the repository:
```
Bash
git clone [https://github.com/your-username/orbit-dash.git](https://github.com/your-username/orbit-dash.git)
Navigate to the project directory:
```
```
Bash
cd orbit-dash
Launch the environment:
```
```
Bash
docker compose up --build
```
```
🔗 Quick Links:

🖥️ Front-end (App): http://localhost:5173 - Access the CRM interface.

⚙️ Back-end (API Docs): http://localhost:8000/docs - Interactive Swagger documentation.

🐘 Database: Running on localhost:5432.
```
---

 # 🛡️ Features
 
## ✅ Completed
```
Secure Auth: Industry-standard User Registration & Login via JWT (JSON Web Tokens).

Route Protection: Secure private routes using React Guards to prevent unauthorized access.

Validated Forms: Robust client-side validation using Zod and React Hook Form.

Interceptors: Automatic handling of 401 errors (expired sessions) via Axios Interceptors.

Dockerized Environment: Full-stack orchestration for a "one-command" setup.
```
## 🚧 In Progress
```
Lead Table: High-performance dashboard for managing and sorting potential clients.

CRUD Operations: Real-time Create, Read, Update, and Delete for lead data.

Search & Filters: Ability to filter leads by status, name, or date.
```
## 🤝 Contribution
```
Contributions make the open-source community an amazing place to learn, inspire, and create.  

Fork the Project.  

Create your Feature Branch (git checkout -b feature/AmazingFeature).  

Commit your Changes (git commit -m 'feat: add some AmazingFeature').  

Push to the Branch (git push origin feature/AmazingFeature).

Open a Pull Request.
```
## 📝 License
```
This project is protected under the Business Source License 1.1 (BUSL-1.1).

Licensor: Pedro Vitor Cezario Lourenço

Non-Commercial Use: Free for study, testing, and personal development purposes.

Commercial Use: Production use for commercial purposes is strictly prohibited without a specific commercial agreement.

Future Open Source: On January 1st, 2030, this project will automatically transition to the Apache License v2.0.
```
