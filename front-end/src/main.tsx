import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { API_BASE_URL } from "@/lib/api-config";

console.log(">>> URL BACKEND HIỆN TẠI:", API_BASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
