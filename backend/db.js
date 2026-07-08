const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cyber_safety",
  password: "postgres",
  port: 5432,
});

const initializeDatabase = async () => {
  try {
    // ── Core Tables ───────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annex5_threats (
        id SERIAL PRIMARY KEY,
        threat_code VARCHAR(20) UNIQUE,
        title TEXT,
        category TEXT,
        safety_impact BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS annex5_mitigations (
        id SERIAL PRIMARY KEY,
        mitigation_code VARCHAR(10) UNIQUE,
        title TEXT,
        mitigation_group VARCHAR(10),
        implementation_status VARCHAR(30) DEFAULT 'Not Implemented',
        evidence_ref TEXT
      );

      CREATE TABLE IF NOT EXISTS annex5_threat_mitigation_mapping (
        id SERIAL PRIMARY KEY,
        threat_id INT REFERENCES annex5_threats(id) ON DELETE CASCADE,
        mitigation_id INT REFERENCES annex5_mitigations(id) ON DELETE CASCADE,
        effectiveness VARCHAR(20) DEFAULT 'High',
        mandatory BOOLEAN DEFAULT true,
        UNIQUE(threat_id, mitigation_id)
      );

      CREATE TABLE IF NOT EXISTS mitigation_evidence (
        id SERIAL PRIMARY KEY,
        mitigation_id INT REFERENCES annex5_mitigations(id) ON DELETE CASCADE,
        component_id INT,
        evidence_type VARCHAR(50),
        reference_doc TEXT,
        validation_status VARCHAR(20),
        last_review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tara_assessment (
        id SERIAL PRIMARY KEY,
        component_id INT,
        threat_id INT,
        impact_rating INT,
        feasibility_rating INT,
        risk_score INT,
        risk_level VARCHAR(20),
        residual_risk INT,
        treatment VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS threat_master (
        id SERIAL PRIMARY KEY,
        threat_code VARCHAR(20) UNIQUE,
        title TEXT,
        category TEXT,
        impact_score INT DEFAULT 3,
        feasibility_score INT DEFAULT 3,
        safety_impact BOOLEAN DEFAULT true,
        asil_level VARCHAR(10) DEFAULT 'ASIL B'
      );

      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        component_id INT,
        threat_id INT REFERENCES threat_master(id),
        result VARCHAR(20),
        tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS restraint_validation_logs (
        id SERIAL PRIMARY KEY,
        impact INT,
        feasibility INT,
        risk_score INT,
        secure_boot BOOLEAN,
        can_auth BOOLEAN,
        hsm BOOLEAN,
        crash_signal_integrity INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS r156_ota_status (
        id SERIAL PRIMARY KEY,
        component VARCHAR(100) UNIQUE,
        rxswin VARCHAR(100),
        sums_cert_valid BOOLEAN DEFAULT false,
        cert_expiry DATE,
        rollback_capable BOOLEAN DEFAULT false,
        integrity_check BOOLEAN DEFAULT false,
        power_check BOOLEAN DEFAULT false,
        user_notified BOOLEAN DEFAULT false,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS component_threat_applicability (
        id SERIAL PRIMARY KEY,
        component_id INT,
        threat_id    INT,
        UNIQUE(component_id, threat_id)
      );
    `);

    // ── Create components table with UNIQUE on component_name ─────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS components (
        id SERIAL PRIMARY KEY,
        component_name VARCHAR(100) UNIQUE,
        component_type VARCHAR(50),
        safety_level VARCHAR(20),
        compliance_status VARCHAR(30) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Migrations: add columns / constraints if missing ─────────
    await pool.query(`
      ALTER TABLE annex5_mitigations ADD COLUMN IF NOT EXISTS implementation_status VARCHAR(30) DEFAULT 'Not Implemented';
      ALTER TABLE annex5_mitigations ADD COLUMN IF NOT EXISTS evidence_ref TEXT;
    `);

    // Restore UNIQUE constraint on component_threat_applicability if missing
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'component_threat_applicability_component_id_threat_id_key'
            AND conrelid = 'component_threat_applicability'::regclass
        ) THEN
          -- Remove any duplicates first
          DELETE FROM component_threat_applicability a
          USING component_threat_applicability b
          WHERE a.id > b.id
            AND a.component_id = b.component_id
            AND a.threat_id = b.threat_id;
          ALTER TABLE component_threat_applicability
            ADD CONSTRAINT component_threat_applicability_component_id_threat_id_key
            UNIQUE (component_id, threat_id);
        END IF;
      END $$;
    `);

    // ── Seed Annex 5 A1 Threats ───────────────────────────────────
    await pool.query(`
      INSERT INTO annex5_threats (threat_code, title, category, safety_impact) VALUES
        ('4.1',  'CAN Message Spoofing',              'Communication', true),
        ('6.2',  'Man-in-the-Middle Attack',           'Communication', true),
        ('6.3',  'Replay Attack',                      'Communication', true),
        ('11.1', 'Malicious CAN Messages',             'Communication', true),
        ('11.3', 'Malicious Diagnostic Messages',      'Diagnostic',    true),
        ('12.1', 'Compromised OTA Update',             'Update',        true),
        ('12.3', 'Manipulated Firmware Pre-Update',    'Update',        true),
        ('12.4', 'Key Compromise',                     'Update',        true),
        ('13.1', 'Denial of Update',                   'Update',        false),
        ('16.1', 'Remote Telematics Manipulation',     'External',      true),
        ('18.1', 'USB Code Injection',                 'External',      true),
        ('18.3', 'OBD Port Misuse',                    'External',      true),
        ('20.1', 'Unauthorized ECU Config Change',     'Data',          true),
        ('21.1', 'Deletion of Logs',                   'Data',          false),
        ('24.1', 'CAN Denial of Service',              'Communication', true),
        ('25.1', 'Manipulation of Vehicle Parameters', 'Data',          true),
        ('26.1', 'Weak Encryption',                    'Cryptography',  true),
        ('28.2', 'Debug/JTAG Exposure',                'Development',   true),
        ('29.2', 'Network Segmentation Bypass',        'Development',   true)
      ON CONFLICT (threat_code) DO NOTHING;
    `);

    // ── Seed Annex 5 B + C Mitigations ───────────────────────────
    await pool.query(`
      INSERT INTO annex5_mitigations (mitigation_code, title, mitigation_group, implementation_status, evidence_ref) VALUES
        ('M7',  'Access Control',               'B', 'Implemented', 'SEC-CTL-001'),
        ('M9',  'Privilege Protection',          'B', 'Implemented', 'SEC-PRIV-002'),
        ('M10', 'Message Authentication (HMAC)', 'B', 'Implemented', 'CAN-AUTH-003'),
        ('M11', 'Secure Key Storage (HSM)',      'B', 'Implemented', 'HSM-INT-004'),
        ('M13', 'DoS Detection & Rate Limiting', 'B', 'Partial',     'DOS-DET-005'),
        ('M15', 'Malicious Message Detection',   'B', 'Partial',     'IDS-MSG-006'),
        ('M16', 'Secure OTA Update',             'B', 'Implemented', 'OTA-SEC-007'),
        ('M23', 'Secure Development Lifecycle',  'B', 'Implemented', 'SDL-PROC-008'),
        ('M24', 'Data Integrity Protection',     'B', 'Partial',     'DATA-INT-009'),
        ('M1',  'Backend Access Control',        'C', 'Implemented', 'BACK-CTL-010'),
        ('M2',  'Secure Cloud Storage',          'C', 'Implemented', 'CLOUD-SEC-011'),
        ('M3',  'Insider Threat Prevention',     'C', 'Partial',     'INSIDER-012'),
        ('M4',  'Logging Enforcement',           'C', 'Implemented', 'LOG-ENF-013'),
        ('M5',  'Data Confidentiality',          'C', 'Implemented', 'DATA-CONF-014'),
        ('M18', 'Role-Based Access Control',     'C', 'Implemented', 'RBAC-015'),
        ('M19', 'Audit Trail',                   'C', 'Partial',     'AUDIT-016')
      ON CONFLICT (mitigation_code) DO UPDATE SET
        implementation_status = EXCLUDED.implementation_status,
        evidence_ref = EXCLUDED.evidence_ref;
    `);

    // ── Seed annex5_threat_mitigation_mapping ─────────────────────
    await pool.query(`
      INSERT INTO annex5_threat_mitigation_mapping (threat_id, mitigation_id, effectiveness, mandatory)
      SELECT t.id, m.id, 'High', true
      FROM annex5_threats t, annex5_mitigations m
      WHERE (t.threat_code='4.1'  AND m.mitigation_code='M10')
         OR (t.threat_code='6.2'  AND m.mitigation_code='M10')
         OR (t.threat_code='6.3'  AND m.mitigation_code='M10')
         OR (t.threat_code='11.1' AND m.mitigation_code='M15')
         OR (t.threat_code='11.3' AND m.mitigation_code='M7')
         OR (t.threat_code='12.1' AND m.mitigation_code='M16')
         OR (t.threat_code='12.3' AND m.mitigation_code='M16')
         OR (t.threat_code='12.4' AND m.mitigation_code='M11')
         OR (t.threat_code='13.1' AND m.mitigation_code='M16')
         OR (t.threat_code='16.1' AND m.mitigation_code='M9')
         OR (t.threat_code='18.1' AND m.mitigation_code='M23')
         OR (t.threat_code='18.3' AND m.mitigation_code='M7')
         OR (t.threat_code='20.1' AND m.mitigation_code='M9')
         OR (t.threat_code='21.1' AND m.mitigation_code='M4')
         OR (t.threat_code='24.1' AND m.mitigation_code='M13')
         OR (t.threat_code='25.1' AND m.mitigation_code='M24')
         OR (t.threat_code='26.1' AND m.mitigation_code='M11')
         OR (t.threat_code='28.2' AND m.mitigation_code='M23')
         OR (t.threat_code='29.2' AND m.mitigation_code='M1')
      ON CONFLICT (threat_id, mitigation_id) DO NOTHING;
    `);

    // ── Seed threat_master ────────────────────────────────────────
    await pool.query(`
      INSERT INTO threat_master (threat_code, title, category, impact_score, feasibility_score, safety_impact, asil_level) VALUES
        ('4.1',  'CAN Message Spoofing',              'Communication', 5, 4, true,  'ASIL D'),
        ('6.2',  'Man-in-the-Middle Attack',           'Communication', 4, 3, true,  'ASIL C'),
        ('6.3',  'Replay Attack',                      'Communication', 3, 3, true,  'ASIL B'),
        ('11.1', 'Malicious CAN Messages',             'Communication', 5, 4, true,  'ASIL D'),
        ('11.3', 'Malicious Diagnostic Messages',      'Diagnostic',    4, 3, true,  'ASIL C'),
        ('12.1', 'Compromised OTA Update',             'Update',        5, 3, true,  'ASIL D'),
        ('12.3', 'Manipulated Firmware Pre-Update',    'Update',        5, 3, true,  'ASIL D'),
        ('12.4', 'Key Compromise',                     'Update',        4, 2, true,  'ASIL C'),
        ('13.1', 'Denial of Update',                   'Update',        2, 3, false, 'ASIL A'),
        ('16.1', 'Remote Telematics Manipulation',     'External',      4, 3, true,  'ASIL C'),
        ('18.1', 'USB Code Injection',                 'External',      4, 2, true,  'ASIL B'),
        ('18.3', 'OBD Port Misuse',                    'External',      3, 4, true,  'ASIL B'),
        ('20.1', 'Unauthorized ECU Config Change',     'Data',          5, 3, true,  'ASIL D'),
        ('21.1', 'Deletion of Logs',                   'Data',          2, 3, false, 'ASIL A'),
        ('24.1', 'CAN Denial of Service',              'Communication', 5, 5, true,  'ASIL D'),
        ('25.1', 'Manipulation of Vehicle Parameters', 'Data',          5, 3, true,  'ASIL D'),
        ('26.1', 'Weak Encryption',                    'Cryptography',  4, 4, true,  'ASIL C'),
        ('28.2', 'Debug/JTAG Exposure',                'Development',   4, 3, true,  'ASIL C'),
        ('29.2', 'Network Segmentation Bypass',        'Development',   4, 3, true,  'ASIL C')
      ON CONFLICT (threat_code) DO NOTHING;
    `);

    // ── Seed Components (WHERE NOT EXISTS prevents dupes) ────────
    await pool.query(`
      INSERT INTO components (component_name, component_type, safety_level, compliance_status)
      SELECT v.name, v.type, v.level, 'Active'
      FROM (VALUES
        ('Airbag ECU',                'Restraint',     'ASIL D'),
        ('Seatbelt Pretensioner ECU', 'Restraint',     'ASIL D'),
        ('OTA Module',                'Update',        'ASIL B'),
        ('Central Gateway ECU',       'Network',       'ASIL C'),
        ('Telematics Control Unit',   'Communication', 'ASIL B'),
        ('Body Control Module',       'Body',          'ASIL B'),
        ('ADAS ECU',                  'Safety',        'ASIL D'),
        ('Powertrain ECU',            'Powertrain',    'ASIL C'),
        ('Brake Control Module',      'Safety',        'ASIL D'),
        ('EV Battery Management',     'EV',            'ASIL C'),
        ('Chassis Control ECU',       'Chassis',       'ASIL B'),
        ('Infotainment Head Unit',    'Infotainment',  'QM')
      ) AS v(name, type, level)
      WHERE NOT EXISTS (
        SELECT 1 FROM components WHERE component_name = v.name
      );
    `);

    // ── Seed R156 OTA Status ──────────────────────────────────────
    await pool.query(`
      INSERT INTO r156_ota_status (component, rxswin, sums_cert_valid, cert_expiry, rollback_capable, integrity_check, power_check, user_notified) VALUES
        ('Airbag ECU',                'RXSWIN-AEB-001', true,  '2026-12-31', true,  true,  true,  true),
        ('Seatbelt Pretensioner ECU', 'RXSWIN-SBT-002', true,  '2026-06-30', true,  true,  false, true),
        ('OTA Module',                'RXSWIN-OTA-003', false, '2025-03-01', false, true,  true,  false),
        ('Central Gateway ECU',       'RXSWIN-GWY-004', true,  '2027-01-15', true,  true,  true,  true),
        ('Telematics Control Unit',   'RXSWIN-TCU-005', true,  '2026-09-30', true,  true,  true,  true),
        ('Body Control Module',       'RXSWIN-BCM-006', true,  '2026-11-30', true,  false, true,  false),
        ('ADAS ECU',                  'RXSWIN-ADA-007', false, '2025-06-01', false, true,  false, false),
        ('Powertrain ECU',            'RXSWIN-PTR-008', true,  '2027-03-31', true,  true,  true,  true),
        ('Brake Control Module',      'RXSWIN-BCK-009', true,  '2026-08-31', true,  true,  true,  true),
        ('EV Battery Management',     'RXSWIN-BMS-010', false, '2025-12-31', false, true,  false, false),
        ('Chassis Control ECU',       'RXSWIN-CHS-011', true,  '2027-06-30', true,  true,  true,  true),
        ('Infotainment Head Unit',    'RXSWIN-IHU-012', true,  '2026-04-30', false, true,  true,  true)
      ON CONFLICT (component) DO NOTHING;
    `);

    // ── Seed component_threat_applicability ───────────────────────
    await pool.query(`
      INSERT INTO component_threat_applicability (component_id, threat_id)
      SELECT c.id, t.id
      FROM components c, annex5_threats t
      WHERE
        (c.component_name = 'Airbag ECU'                AND t.threat_code IN ('4.1','6.2','6.3','11.1','20.1','24.1','25.1','26.1','28.2'))
     OR (c.component_name = 'Seatbelt Pretensioner ECU' AND t.threat_code IN ('4.1','6.3','11.1','11.3','20.1','24.1','25.1','28.2'))
     OR (c.component_name = 'OTA Module'                AND t.threat_code IN ('12.1','12.3','12.4','13.1','16.1','26.1','29.2'))
     OR (c.component_name = 'Central Gateway ECU'       AND t.threat_code IN ('6.2','11.1','16.1','18.1','18.3','21.1','24.1','29.2'))
     OR (c.component_name = 'Telematics Control Unit'   AND t.threat_code IN ('6.2','12.1','16.1','18.1','21.1','26.1','29.2'))
     OR (c.component_name = 'Body Control Module'       AND t.threat_code IN ('4.1','11.1','18.3','20.1','24.1','25.1','28.2'))
     OR (c.component_name = 'ADAS ECU'                  AND t.threat_code IN ('4.1','6.2','6.3','11.1','20.1','24.1','25.1','26.1','28.2','29.2'))
     OR (c.component_name = 'Powertrain ECU'            AND t.threat_code IN ('4.1','11.1','11.3','20.1','24.1','25.1','26.1','28.2'))
     OR (c.component_name = 'Brake Control Module'      AND t.threat_code IN ('4.1','6.3','11.1','20.1','24.1','25.1','26.1','28.2'))
     OR (c.component_name = 'EV Battery Management'     AND t.threat_code IN ('12.1','12.4','20.1','25.1','26.1','28.2','29.2'))
     OR (c.component_name = 'Chassis Control ECU'       AND t.threat_code IN ('4.1','11.1','20.1','24.1','25.1','26.1','28.2'))
     OR (c.component_name = 'Infotainment Head Unit'    AND t.threat_code IN ('6.2','12.1','16.1','18.1','18.3','21.1','26.1','29.2'))
      ON CONFLICT (component_id, threat_id) DO NOTHING;
    `);

    // ── clause_master with component mapping ────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clause_master (
        id                       SERIAL PRIMARY KEY,
        regulation_type          VARCHAR(50),
        clause_ref               VARCHAR(50) UNIQUE,
        clause_title             TEXT,
        requirement_description  TEXT,
        evidence_template        TEXT,
        required_keywords        TEXT[],
        expected_document_type   VARCHAR(50),
        applicable_components    TEXT[]
      );
    `);

    // ── Seed clause_master (full ECU-to-clause mapping) ──────────
    await pool.query(`
      INSERT INTO clause_master
        (regulation_type, clause_ref, clause_title, requirement_description, evidence_template, required_keywords, expected_document_type, applicable_components)
      VALUES
        -- UN R155 Annex 5 §A5.1 — CSMS Governance (system-level → ALL)
        ('UNR155','R155-A5.1.1','CSMS Established','CSMS established and documented',
         'CSMS policy document, version-controlled',
         ARRAY['csms','policy','version control','approval','governance'],
         'Policy', ARRAY['ALL']),
        ('UNR155','R155-A5.1.2','Governance Structure','Cybersecurity governance structure defined',
         'Org chart with CS roles, board approval record',
         ARRAY['governance','org chart','roles','board','cybersecurity'],
         'Policy', ARRAY['ALL']),
        ('UNR155','R155-A5.1.3','Roles & Responsibilities','Defined roles & responsibilities for cybersecurity',
         'RACI matrix, job descriptions',
         ARRAY['raci','roles','responsibilities','job description'],
         'Procedure', ARRAY['ALL']),
        ('UNR155','R155-A5.1.4','Incident Response','Incident response process documented and tested',
         'IRP document, tabletop exercise records',
         ARRAY['incident response','irp','tabletop','escalation'],
         'IRP Record', ARRAY['ALL']),
        ('UNR155','R155-A5.1.5','Risk Assessment Procedure','Risk assessment procedure established',
         'Risk assessment SOP, TARA methodology doc',
         ARRAY['risk assessment','tara','methodology','sop'],
         'Risk Assessment', ARRAY['ALL']),
        -- UN R155 §A5.2 — Risk Management (component-specific)
        ('UNR155','R155-A5.2.1','Risk Identification','Risk identification & analysis per vehicle type',
         'TARA report per vehicle platform',
         ARRAY['tara','threat','risk','vehicle','platform','analysis'],
         'TARA Document',
         ARRAY['Airbag ECU','Seatbelt Pretensioner ECU','Brake Control Module','Powertrain ECU','Chassis Control ECU','ADAS ECU']),
        ('UNR155','R155-A5.2.2','Threat Evaluation','Threat evaluation with impact/feasibility scoring',
         'Threat catalog with CVSS/HEAVENS scores',
         ARRAY['threat','cvss','heavens','feasibility','impact','scoring'],
         'TARA Document',
         ARRAY['Airbag ECU','Seatbelt Pretensioner ECU','Brake Control Module','Powertrain ECU','Chassis Control ECU','ADAS ECU','Central Gateway ECU']),
        ('UNR155','R155-A5.2.3','Monitoring & Detection','Monitoring & detection mechanisms in place',
         'IDS/IDPS deployment evidence, SIEM logs',
         ARRAY['ids','idps','siem','monitoring','detection','log'],
         'Report',
         ARRAY['Central Gateway ECU','Telematics Control Unit','ADAS ECU','Infotainment Head Unit','OTA Module']),
        ('UNR155','R155-A5.2.4','Secure Development','Secure development lifecycle (SDL) evidence',
         'SDL process doc, code review records, SAST reports',
         ARRAY['sdl','secure development','code review','sast','lifecycle'],
         'Procedure', ARRAY['ALL']),
        ('UNR155','R155-A5.2.5','Supplier Management','Supplier cybersecurity management requirements',
         'Supplier CS questionnaire, contract clauses',
         ARRAY['supplier','questionnaire','contract','third party','vendor'],
         'Audit Record', ARRAY['ALL']),
        -- UN R155 §A5.3 — Post-Production
        ('UNR155','R155-A5.3.1','Post-Production Monitoring','Post-production monitoring process active',
         'Vulnerability monitoring SOP, CVE tracking',
         ARRAY['monitoring','cve','vulnerability','post-production','tracking'],
         'Report',
         ARRAY['OTA Module','Central Gateway ECU','Telematics Control Unit','ADAS ECU','Infotainment Head Unit']),
        ('UNR155','R155-A5.3.2','OTA Security Controls','OTA update security controls implemented',
         'OTA signing key management, rollback procedure',
         ARRAY['ota','signing','rollback','update','integrity'],
         'Procedure',
         ARRAY['OTA Module','Central Gateway ECU','Telematics Control Unit','EV Battery Management']),
        ('UNR155','R155-A5.3.3','Vulnerability Handling','Vulnerability handling process documented',
         'VDP policy, patch SLA definition',
         ARRAY['vdp','patch','vulnerability','handling','sla'],
         'Policy', ARRAY['ALL']),
        ('UNR155','R155-A5.3.4','Incident Reporting','Incident reporting mechanism to authority',
         'Regulatory reporting template, contact list',
         ARRAY['reporting','authority','regulatory','incident','contact'],
         'IRP Record', ARRAY['ALL']),
        -- ISO/SAE 21434 §8 — TARA (ALL ECUs)
        ('ISO21434','21434-8.3','Asset Identification','Asset identification completed for target component',
         'Asset register with security properties',
         ARRAY['asset','register','security','property','identification'],
         'TARA Document', ARRAY['ALL']),
        ('ISO21434','21434-8.4','Damage Scenarios','Damage scenario definition with impact rating',
         'Damage scenario table (Safety/Financial/Privacy/Operational)',
         ARRAY['damage','scenario','impact','safety','financial','privacy'],
         'TARA Document', ARRAY['ALL']),
        ('ISO21434','21434-8.5','Threat Scenarios','Threat scenario derivation from damage scenarios',
         'Threat scenario catalog linked to assets',
         ARRAY['threat','scenario','catalog','asset','derivation'],
         'TARA Document', ARRAY['ALL']),
        ('ISO21434','21434-8.6','Attack Path Analysis','Attack path analysis (attack tree / STRIDE)',
         'Attack tree diagrams, STRIDE analysis worksheet',
         ARRAY['attack','tree','stride','path','analysis'],
         'TARA Document', ARRAY['ALL']),
        ('ISO21434','21434-8.7','Risk Calculation','Risk calculation: Impact × Attack Feasibility',
         'Risk matrix with CVSS/HEAVENS feasibility scores',
         ARRAY['risk','matrix','cvss','heavens','feasibility','calculation'],
         'Risk Assessment', ARRAY['ALL']),
        ('ISO21434','21434-9.3','Security Objectives','Security objectives defined per threat scenario',
         'Cybersecurity goals document',
         ARRAY['security','objective','goal','cybersecurity','threat'],
         'Policy', ARRAY['ALL']),
        ('ISO21434','21434-9.4','Security Requirements','Security requirements traceable to goals',
         'Requirements traceability matrix (RTM)',
         ARRAY['requirement','traceability','rtm','traceable','goal'],
         'Report', ARRAY['ALL']),
        ('ISO21434','21434-9.5','Verification Strategy','Verification strategy defined for each requirement',
         'Verification plan, test case mapping',
         ARRAY['verification','plan','test','strategy','requirement'],
         'Report', ARRAY['ALL']),
        ('ISO21434','21434-15.1','Penetration Testing','Penetration testing performed on target ECU',
         'Pentest report, findings log, remediation status',
         ARRAY['pentest','penetration','finding','remediation','report'],
         'Report',
         ARRAY['Airbag ECU','Brake Control Module','ADAS ECU','Central Gateway ECU','Powertrain ECU','EV Battery Management','Chassis Control ECU']),
        ('ISO21434','21434-15.2','Fuzz Testing','Fuzz testing on communication interfaces',
         'Fuzz test results (CAN, UDS, Ethernet)',
         ARRAY['fuzz','fuzzing','can','uds','ethernet','interface'],
         'Report',
         ARRAY['Central Gateway ECU','ADAS ECU','Telematics Control Unit','Infotainment Head Unit','OTA Module']),
        ('ISO21434','21434-15.3','Vulnerability Scanning','Vulnerability scanning of software components',
         'SCA/SAST scan reports, CVE remediation log',
         ARRAY['sca','sast','scan','cve','vulnerability','software'],
         'Report', ARRAY['ALL']),
        ('ISO21434','21434-15.4','Risk Acceptance','Risk acceptance decision documented',
         'Signed risk acceptance record with rationale',
         ARRAY['risk acceptance','signed','rationale','decision','record'],
         'Audit Record', ARRAY['ALL']),
        -- CSMS (system-level → ALL)
        ('CSMS','CSMS-1','Cybersecurity Policy','Cybersecurity policy approved by top management',
         'Signed policy document, board minutes',
         ARRAY['policy','top management','signed','board','cybersecurity'],
         'Policy', ARRAY['ALL']),
        ('CSMS','CSMS-2','Org Roles','Organization roles and responsibilities defined',
         'RACI matrix, appointment letters',
         ARRAY['raci','roles','responsibilities','appointment','organization'],
         'Policy', ARRAY['ALL']),
        ('CSMS','CSMS-3','Competence Management','Competence management — CS training records',
         'Training matrix, certification records',
         ARRAY['training','competence','certification','matrix','records'],
         'Audit Record', ARRAY['ALL']),
        ('CSMS','CSMS-4','Supplier Integration','Supplier cybersecurity integration requirements',
         'Supplier CS assessment, contractual obligations',
         ARRAY['supplier','assessment','contractual','obligation','vendor'],
         'Audit Record', ARRAY['ALL']),
        ('CSMS','CSMS-5','Incident Response Mgmt','Incident response management process active',
         'IRP, escalation matrix, drill records',
         ARRAY['incident','response','escalation','drill','irp'],
         'IRP Record', ARRAY['ALL']),
        ('CSMS','CSMS-6','Monitoring Infrastructure','Monitoring and logging infrastructure deployed',
         'SIEM configuration, log retention policy',
         ARRAY['siem','logging','monitoring','log retention','infrastructure'],
         'Report', ARRAY['ALL']),
        ('CSMS','CSMS-7','Continuous Improvement','Continuous improvement process established',
         'Lessons-learned log, improvement action tracker',
         ARRAY['improvement','lessons learned','action','tracker','continuous'],
         'Procedure', ARRAY['ALL']),
        ('CSMS','CSMS-8','Audit & Review','Audit & review mechanism with defined frequency',
         'Audit schedule, last audit report',
         ARRAY['audit','review','schedule','frequency','report'],
         'Audit Record', ARRAY['ALL'])
      ON CONFLICT (clause_ref) DO UPDATE SET
        applicable_components = EXCLUDED.applicable_components,
        required_keywords     = EXCLUDED.required_keywords,
        evidence_template     = EXCLUDED.evidence_template;
    `);

    // ── New tables: compliance_checklist + evidence_files ────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS compliance_checklist (
        id            SERIAL PRIMARY KEY,
        role          VARCHAR(60),
        component     VARCHAR(100),
        standard      VARCHAR(30),
        clause_ref    VARCHAR(30),
        requirement   TEXT,
        evidence_required TEXT,
        status        VARCHAR(30) DEFAULT 'Pending',
        UNIQUE(role, component, standard, clause_ref)
      );

      CREATE TABLE IF NOT EXISTS evidence_files (
        id                SERIAL PRIMARY KEY,
        clause_id         INT REFERENCES compliance_checklist(id) ON DELETE CASCADE,
        role              VARCHAR(60),
        component         VARCHAR(100),
        clause_ref        VARCHAR(30),
        file_name         VARCHAR(255),
        file_path         TEXT,
        upload_date       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        validation_score  INT DEFAULT 0,
        validation_status VARCHAR(30) DEFAULT 'Pending'
      );

      CREATE TABLE IF NOT EXISTS manual_uploads (
        id               SERIAL PRIMARY KEY,
        role             VARCHAR(60),
        component        VARCHAR(100),
        clause_ref       VARCHAR(30),
        validation_score INT DEFAULT 0,
        risk_level       VARCHAR(20),
        status           VARCHAR(30),
        uploaded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Database initialized with full Annex 5 + TARA + R156 + component applicability schema");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
  }
};

initializeDatabase();
module.exports = pool;
