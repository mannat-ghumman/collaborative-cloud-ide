import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "cloudide",
  user: "postgres",
  password: "Ghumman@541",
});

export default pool;