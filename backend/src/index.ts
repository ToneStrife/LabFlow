import express from 'express';
import cors from 'cors';
import { mockProfiles } from '../../src/data/mockData'; // Import mock data from frontend

const app = express();
const port = process.env.PORT || 3001;

// Configurar CORS para permitir solicitudes desde tu frontend
app.use(cors({
  origin: 'http://localhost:8080', // Asegúrate de que esto coincida con la URL de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json()); // Para parsear cuerpos de solicitud JSON

// Endpoint de ejemplo para obtener perfiles (usando mock data por ahora)
app.get('/api/profiles', (req, res) => {
  res.json(mockProfiles);
});

// Puedes añadir más endpoints aquí para vendors, customer accounts, requests, etc.

app.listen(port, () => {
  console.log(`Backend API listening at http://localhost:${port}`);
});