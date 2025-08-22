// server/src/index.js
import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import planRouter from "./routes/plan.js";

const app = express();
app.use(express.json());

// allow file upload storage
const upload = multer({ dest: "uploads/" });

// --- helper to calculate stats ---
function calculateStats(values) {
  const count = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  return { count, mean, min, max, variance, std_dev: stdDev };
}

// --- /upload route ---
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;
  let rows = [];
  let headers = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("headers", (h) => {
      headers = h;
    })
    .on("data", (row) => {
      rows.push(row);
    })
    .on("end", () => {
      // Detect numeric columns
      let numericColumns = {};
      headers.forEach((col) => {
        let values = rows
          .map((r) => r[col])
          .filter((v) => v !== "" && v != null);
        if (values.length > 0 && values.every((v) => !isNaN(parseFloat(v)))) {
          let numericValues = values.map((v) => parseFloat(v));
          numericColumns[col] = calculateStats(numericValues);
        }
      });

      // Build schema
      const schema = {
        columns: headers.map((c) => ({
          name: c,
          type: numericColumns[c] ? "number" : "string",
        })),
      };

      // Cleanup file
      fs.unlinkSync(filePath);

      res.json({
        schema,
        numericColumns: Object.keys(numericColumns),
        rows: rows.slice(0, 10), // preview
        headers,
        numeric_analysis: numericColumns,
      });
    });
});

// --- mount /plan ---
app.use("/plan", planRouter);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
