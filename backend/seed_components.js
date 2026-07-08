const { Pool } = require("pg");
const p = new Pool({ user:"postgres", host:"localhost", database:"cyber_safety", password:"postgres", port:5432 });

async function run() {
  const sql = `
    INSERT INTO component_threat_applicability (component_id, threat_id)
    SELECT r.id, t.id FROM r156_ota_status r, annex5_threats t
    WHERE
      ((r.component='Telematics Control Unit'   AND t.threat_code IN ('6.2','12.1','16.1','18.1','21.1','26.1','29.2'))
    OR (r.component='Body Control Module'       AND t.threat_code IN ('4.1','11.1','18.3','20.1','24.1','25.1','28.2'))
    OR (r.component='ADAS ECU'                  AND t.threat_code IN ('4.1','6.2','6.3','11.1','20.1','24.1','25.1','26.1','28.2','29.2'))
    OR (r.component='Powertrain ECU'            AND t.threat_code IN ('4.1','11.1','11.3','20.1','24.1','25.1','26.1','28.2'))
    OR (r.component='Brake Control Module'      AND t.threat_code IN ('4.1','6.3','11.1','20.1','24.1','25.1','26.1','28.2'))
    OR (r.component='EV Battery Management'     AND t.threat_code IN ('12.1','12.4','20.1','25.1','26.1','28.2','29.2'))
    OR (r.component='Chassis Control ECU'       AND t.threat_code IN ('4.1','11.1','20.1','24.1','25.1','26.1','28.2'))
    OR (r.component='Infotainment Head Unit'    AND t.threat_code IN ('6.2','12.1','16.1','18.1','18.3','21.1','26.1','29.2'))
    OR (r.component='Central Gateway ECU'       AND t.threat_code IN ('6.2','11.1','16.1','18.1','18.3','21.1','24.1','29.2'))
    OR (r.component='Seatbelt Pretensioner ECU' AND t.threat_code IN ('4.1','6.3','11.1','11.3','20.1','24.1','25.1','28.2')))
    AND NOT EXISTS (
      SELECT 1 FROM component_threat_applicability x
      WHERE x.component_id = r.id AND x.threat_id = t.id
    )
  `;
  const r = await p.query(sql);
  console.log("✅ Inserted:", r.rowCount, "rows");

  const check = await p.query(`
    SELECT r.component, COUNT(cta.threat_id) AS threats
    FROM r156_ota_status r
    LEFT JOIN component_threat_applicability cta ON cta.component_id = r.id
    GROUP BY r.component ORDER BY r.component
  `);
  check.rows.forEach(row =>
    console.log(row.component.padEnd(32), row.threats, "threats")
  );
  await p.end();
}

run().catch(e => { console.error("❌", e.message); p.end(); });
