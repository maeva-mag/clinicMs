import express from "express";
import connectDB from "./db/db.js";
import patientRoutes from "./routes/patient.js";
import adminRoutes from "./routes/admin.js";
import nurseRoutes from "./routes/nurse.js";
import doctorRoutes from "./routes/doctor.js";
import authRoutes from "./routes/auth.js";
import shiftRoutes from "./routes/shift.js";
import departmentRoutes from "./routes/department.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();

app.use(cors()); // allow frontend request
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/nurses', nurseRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/departments', departmentRoutes);


const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('API is running');
});

app.use((req, res) => {
  console.log(`404 - Logic hit for: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found on server' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });