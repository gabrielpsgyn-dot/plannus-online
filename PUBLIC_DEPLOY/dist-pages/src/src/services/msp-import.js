function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

function toISO(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) {
      year += 2000;
    }
    return `${year}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
  }
  return null;
}

function parsePredToken(token) {
  const raw = String(token || "").trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(/^(\d+)\s*([A-Za-z]{2})?\s*([+-]\s*\d+)?/);
  if (!match) {
    return null;
  }
  const rawType = String(match[2] || "FS").toUpperCase();
  const relationMap = { TI: "FS", II: "SS", TT: "FF", IT: "SF", FS: "FS", SS: "SS", FF: "FF", SF: "SF" };
  return {
    predTaskId: Number(match[1]),
    type: relationMap[rawType] || "FS",
    lagDays: match[3] ? parseInt(match[3].replace(/\s+/g, ""), 10) || 0 : 0,
  };
}

function splitPreds(raw) {
  return String(raw || "").split(/[;,]/).map(parsePredToken).filter(Boolean);
}

function detectDelimiter(line) {
  if (line.includes("\t")) {
    return "\t";
  }
  return line.split(";").length >= line.split(",").length ? ";" : ",";
}

function parseTable(raw) {
  const lines = String(raw || "").replace(/^\ufeff/, "").split(/\r?\n/).filter((line) => String(line).trim());
  if (!lines.length) {
    return { headers: [], rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const split = (line) => line.split(delimiter).map((cell) => String(cell || "").trim());
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

function mapColumns(headers) {
  const normalized = headers.map(norm);
  const findIndex = (variants) => variants.map(norm).map((variant) => normalized.indexOf(variant)).find((index) => index >= 0) ?? -1;
  return {
    id: findIndex(["id", "id da tarefa", "task id"]),
    level: findIndex(["nivel", "nível", "level", "outline level", "outline"]),
    name: findIndex(["nome", "task name", "name", "nome da tarefa"]),
    start: findIndex(["inicio", "início", "start", "data de inicio", "data de início"]),
    finish: findIndex(["termino", "término", "finish", "data de termino", "data de término"]),
    predecessors: findIndex(["predecessoras", "predecessors", "pred", "predecessor"]),
    resources: findIndex(["nomes dos recursos", "resource names", "resources", "resource names"]),
    wbs: findIndex(["wbs", "eap"]),
  };
}

function parseResources(raw) {
  return String(raw || "")
    .split(/[;,/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferLocationKind(name) {
  const value = norm(name);
  if (!value) {
    return "pavimento_tipo";
  }
  if (/\b(area comum|academia|spa|salao|sal[aã]o|piscina|lazer|churrasqueira|play|gourmet|hall)\b/.test(value)) {
    return "area_comum";
  }
  if (/\b(terreo|t[eé]rreo|subsolo|cobertura|barrilete|atico|ático|rooftop)\b/.test(value)) {
    return "especial";
  }
  return "pavimento_tipo";
}

function dayDiff(startISO, endISO) {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const end = Date.parse(`${endISO}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

export function importMspProject(rawText, options) {
  const table = parseTable(rawText);
  const columns = mapColumns(table.headers);
  const required = ["level", "name", "start", "finish"];
  const missing = required.filter((key) => columns[key] < 0);
  if (missing.length) {
    throw new Error(`Colunas obrigatorias ausentes para MSP: ${missing.join(", ")}`);
  }

  const obraId = options.obraId;
  const serviceLevel = Number(options.serviceLevel || 2);
  const locationLevel = Number(options.locationLevel || serviceLevel + 1);
  const importedRows = [];
  let currentService = null;
  let currentServiceWbs = null;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    const level = Number(row[columns.level]);
    const name = String(row[columns.name] || "").trim();
    if (!name || !Number.isFinite(level)) {
      continue;
    }
    const startISO = toISO(row[columns.start]);
    const finishISO = toISO(row[columns.finish]);
    if (!startISO || !finishISO) {
      continue;
    }
    const mspId = columns.id >= 0 ? Number(row[columns.id]) : rowIndex + 1;
    const resources = columns.resources >= 0 ? parseResources(row[columns.resources]) : [];
    const predRaw = columns.predecessors >= 0 ? String(row[columns.predecessors] || "") : "";
    const wbs = columns.wbs >= 0 ? String(row[columns.wbs] || "") : "";

    if (level === serviceLevel) {
      currentService = name;
      currentServiceWbs = wbs;
      continue;
    }

    if (level >= locationLevel && currentService) {
      importedRows.push({
        mspId,
        level,
        serviceName: currentService,
        serviceWbs: currentServiceWbs,
        taskName: name,
        locationName: name,
        startISO,
        finishISO,
        resources,
        predecessors: splitPreds(predRaw),
      });
    }
  }

  if (!importedRows.length) {
    throw new Error("Nenhuma task importavel encontrada com os niveis informados.");
  }

  const serviceMap = new Map();
  const locationMap = new Map();
  const teamMap = new Map();
  const eapMap = new Map();
  const tasks = [];
  const quantities = [];

  importedRows.forEach((row, index) => {
    const serviceKey = slug(row.serviceName);
    const locationKey = slug(row.locationName);
    const eapId = `eap-import-${serviceKey}`;
    if (!eapMap.has(serviceKey)) {
      eapMap.set(serviceKey, {
        id: eapId,
        obraId,
        codigoEAP: row.serviceWbs || `IMP.${eapMap.size + 1}`,
        nome: row.serviceName,
        nivel: serviceLevel,
        parentId: null,
        ordem: eapMap.size + 1,
        ativo: true,
      });
    }
    if (!serviceMap.has(serviceKey)) {
      serviceMap.set(serviceKey, {
        id: `srv-import-${serviceKey}`,
        obraId,
        codigoServico: `IMP-${String(serviceMap.size + 1).padStart(3, "0")}`,
        nome: row.serviceName,
        unidadeMedicao: "vb",
        categoria: "Importado MSP",
        disciplina: "Planejamento",
        permiteParalelo: true,
        exigeEquipe: false,
        exigeQuantidade: false,
        exigeProdutividade: false,
        corVisual: ["#0f4c5c", "#1f7a8c", "#2a9d8f", "#e09f3e", "#c44536"][serviceMap.size % 5],
        ordem: serviceMap.size + 1,
        ativo: true,
      });
    }
    if (!locationMap.has(locationKey)) {
      locationMap.set(locationKey, {
        id: `loc-import-${locationKey}`,
        obraId,
        tipoLocal: inferLocationKind(row.locationName),
        nome: row.locationName,
        codigo: `LOC-${String(locationMap.size + 1).padStart(3, "0")}`,
        ordem: locationMap.size + 1,
        parentId: null,
        torre: null,
        bloco: null,
        pavimento: null,
        unidade: null,
        area: null,
        metadados: { origem: "MSP", imported: true },
      });
    }
    const service = serviceMap.get(serviceKey);
    const location = locationMap.get(locationKey);
    const taskId = `task:import:${obraId}:${row.mspId}`;
    const primaryTeamName = row.resources[0] || `Equipe ${service.nome}`;
    const teamKey = slug(primaryTeamName);
    if (!teamMap.has(teamKey)) {
      teamMap.set(teamKey, {
        id: `team-import-${teamKey}`,
        obraId,
        nome: primaryTeamName,
        codigo: `EQ-IMP-${String(teamMap.size + 1).padStart(3, "0")}`,
        tipoEquipe: "MSP Importada",
        serviceIdsPermitidos: [service.id],
        produtividadeBase: 1,
        unidadeProdutividade: "task/dia",
        custoDia: 0,
        capacidadeSimultanea: 1,
        ativa: true,
        calendarioId: options.calendarioPadraoId,
      });
    } else if (!teamMap.get(teamKey).serviceIdsPermitidos.includes(service.id)) {
      teamMap.get(teamKey).serviceIdsPermitidos.push(service.id);
    }
    const duration = dayDiff(row.startISO, row.finishISO);
    tasks.push({
      id: taskId,
      obraId,
      serviceId: service.id,
      locationId: location.id,
      equipeId: teamMap.get(teamKey).id,
      eapId,
      quantidade: 1,
      produtividadePlanejada: 1 / duration,
      duracaoPlanejadaDias: duration,
      baselineStartISO: null,
      baselineEndISO: null,
      plannedStartISO: row.startISO,
      plannedEndISO: row.finishISO,
      actualStartISO: null,
      actualEndISO: null,
      percentComplete: 0,
      status: "NAO_INICIADO",
      predecessorTaskIds: [],
      successorTaskIds: [],
      isCritical: false,
      sourceRule: "MSP_IMPORT",
      bloqueios: [],
      observacoes: `Importado do MSP Project. Nome original: ${row.taskName}`,
      inconsistente: false,
      externalReference: { mspId: row.mspId, resources: row.resources, predecessors: row.predecessors },
    });
    quantities.push({
      id: `qty-import-${index + 1}`,
      obraId,
      serviceId: service.id,
      locationId: location.id,
      quantidade: 1,
      unidade: "vb",
      fatorComplexidade: 1,
      observacoes: "Quantidade sintetica criada a partir da importacao MSP.",
    });
  });

  const taskByMspId = new Map(tasks.map((task) => [task.externalReference.mspId, task]));
  importedRows.forEach((row) => {
    const task = taskByMspId.get(row.mspId);
    row.predecessors.forEach((pred) => {
      const predecessorTask = taskByMspId.get(pred.predTaskId);
      if (predecessorTask) {
        task.predecessorTaskIds.push(predecessorTask.id);
        predecessorTask.successorTaskIds.push(task.id);
      }
    });
  });

  const maxEnd = tasks.map((task) => task.plannedEndISO).sort().at(-1);
  tasks.forEach((task) => {
    task.isCritical = task.plannedEndISO === maxEnd || task.successorTaskIds.length === 0;
  });

  return {
    importedState: {
      eaps: [...eapMap.values()],
      services: [...serviceMap.values()],
      locations: [...locationMap.values()],
      teams: [...teamMap.values()],
      quantities,
      tasks,
      dependencies: [],
      teamRules: [],
    },
    summary: {
      taskCount: tasks.length,
      serviceCount: serviceMap.size,
      locationCount: locationMap.size,
      teamCount: teamMap.size,
      importedFinish: maxEnd,
    },
  };
}
