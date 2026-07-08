const { Client } = require("pg");
const xlsx = require("xlsx");

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "cyber_safety",
  password: "postgres",
  port: 5432,
});

async function run() {
  await client.connect();

  const workbook = xlsx.readFile("dashboard_data.xlsx");

  // ===== STANDARDS IMPORT =====
  const standardsSheet = workbook.Sheets["Standards_&_Regulations"];
  const standardsData = xlsx.utils.sheet_to_json(standardsSheet);

  for (const row of standardsData) {
    await client.query(
      `INSERT INTO standards 
       (standard_code, title, description, category, version)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (standard_code) DO NOTHING`,
      [
        row["Standard Code"],
        row["Title"],
        row["Description"],
        row["Category"],
        row["Version"]
      ]
    );
  }

  console.log("Standards imported ✔");

  // ===== THREATS IMPORT =====
  const threatsSheet = workbook.Sheets["Critical_Threats_A1"];
  const threatsData = xlsx.utils.sheet_to_json(threatsSheet);

  for (const row of threatsData) {
    await client.query(
      `INSERT INTO threats 
       (threat_code, name, description, impact_level, likelihood, risk_rating)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (threat_code) DO NOTHING`,
      [
        row["Threat ID"],
        row["Threat Name"],
        row["Description"],
        row["Impact"],
        row["Likelihood"],
        row["Risk Rating"]
      ]
    );
  }

  console.log("Threats imported ✔");

  await client.end();
}

run().catch(console.error);