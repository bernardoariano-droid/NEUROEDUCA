// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import dotenv from "dotenv";

// src/lib/supabaseSyncCore.ts
import { createClient } from "@supabase/supabase-js";
var STUDENT_DOCS_BUCKET = "neuroeduca-student-docs";
var NEUROEDUCA_ENTITY_TABLES = [
  { key: "institutions", table: "neuroeduca_institutions", label: "Institui\xE7\xF5es" },
  { key: "teachers", table: "neuroeduca_teachers", label: "Docentes" },
  { key: "classes", table: "neuroeduca_classes", label: "Turmas" },
  { key: "subjects", table: "neuroeduca_subjects", label: "Disciplinas" },
  { key: "students", table: "neuroeduca_students", label: "Alunos" },
  { key: "grades", table: "neuroeduca_grades", label: "Notas & Pautas" },
  { key: "invoices", table: "neuroeduca_invoices", label: "Facturas & Propinas" },
  { key: "attendance", table: "neuroeduca_attendance", label: "Frequ\xEAncia" },
  { key: "digitalArchive", table: "neuroeduca_digital_archive", label: "Arquivo Digital" },
  {
    key: "financialNotifications",
    table: "neuroeduca_financial_notifications",
    label: "Notifica\xE7\xF5es Financeiras"
  },
  { key: "announcements", table: "neuroeduca_announcements", label: "Comunicados Oficiais" },
  { key: "accounts", table: "neuroeduca_accounts", label: "Contas de Acesso" },
  { key: "schoolUsers", table: "neuroeduca_school_users", label: "Utilizadores" },
  { key: "subscriptionPlans", table: "neuroeduca_subscription_plans", label: "Planos SaaS" },
  { key: "auditLogs", table: "neuroeduca_audit_logs", label: "Auditoria" },
  {
    key: "psychopedagogicalProtocols",
    table: "neuroeduca_psychopedagogical_protocols",
    label: "Protocolos Psicopedag\xF3gicos"
  },
  {
    key: "psychopedagogicalCases",
    table: "neuroeduca_psychopedagogical_cases",
    label: "Dossi\xEAs Psicopedag\xF3gicos"
  }
];
function normalizeSupabaseUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Endere\xE7o URL do Supabase inv\xE1lido. Exemplo: https://seuprojecto.supabase.co");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("O endere\xE7o do Supabase deve usar HTTPS.");
  }
  const host = parsed.hostname.toLowerCase();
  const isAllowedHost = host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  if (!isAllowedHost || host === "supabase.co" || host === "supabase.in") {
    throw new Error(
      "Endere\xE7o n\xE3o reconhecido como projecto Supabase oficial (*.supabase.co ou *.supabase.in)."
    );
  }
  return parsed.origin;
}
function isTableMissingError(error) {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return code === "42P01" || code === "PGRST205" || message.includes("Could not find the table") || message.includes("does not exist");
}
function isPermissionDeniedError(error) {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  if (message.includes("invalid api key") || message.includes("invalid jwt")) {
    return false;
  }
  return code === "42501" || message.includes("permission denied") || message.includes("row-level security") || message.includes("insufficient_privilege");
}
function createValidatedSupabaseClient(rawUrl, anonKey, authOrToken) {
  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  const cleanKey = String(anonKey || "").trim();
  if (!normalizedUrl || !cleanKey) {
    throw new Error("URL do Supabase ou chave p\xFAblica em falta.");
  }
  const cleanAccessToken = typeof authOrToken === "string" ? String(authOrToken || "").trim() : String(authOrToken?.accessToken || "").trim();
  const cleanSessionToken = typeof authOrToken === "object" && authOrToken !== null ? String(authOrToken.sessionToken || "").trim() : "";
  const headers = {};
  if (cleanAccessToken) {
    headers.Authorization = `Bearer ${cleanAccessToken}`;
  }
  if (cleanSessionToken) {
    headers["x-ne-session"] = cleanSessionToken;
  }
  return createClient(normalizedUrl, cleanKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    ...Object.keys(headers).length > 0 ? { global: { headers } } : {}
  });
}
function sanitizePathSegment(raw, fallback = "item") {
  const cleaned = String(raw || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned || fallback;
}
function inferExtensionFromMimeOrName(mimeType, fileName) {
  const match = String(fileName || "").match(/\.([a-zA-Z0-9]{2,6})$/);
  if (match) return `.${match[1].toLowerCase()}`;
  const map = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
  };
  return map[String(mimeType || "").toLowerCase()] || ".bin";
}
function decodeBase64ToBytes(dataUrlOrBase64) {
  const raw = String(dataUrlOrBase64 || "").trim();
  const dataUrlMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
  const detectedMime = dataUrlMatch ? dataUrlMatch[1] : void 0;
  const base64Body = (dataUrlMatch ? dataUrlMatch[2] : raw).replace(/\s+/g, "");
  if (typeof globalThis !== "undefined" && typeof globalThis.Buffer === "function") {
    const buf = globalThis.Buffer.from(base64Body, "base64");
    return { bytes: new Uint8Array(buf), detectedMime };
  }
  const binary = atob(base64Body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, detectedMime };
}
function buildStudentStoragePath(doc) {
  const inst = sanitizePathSegment(doc.institutionId || "geral", "geral");
  const student = sanitizePathSegment(doc.studentId || "sem-aluno", "sem-aluno");
  const category = sanitizePathSegment(doc.category || "outro", "outro");
  const docId = sanitizePathSegment(doc.id || `doc-${Date.now()}`, "doc");
  const ext = inferExtensionFromMimeOrName(doc.mimeType, doc.fileName);
  return `${inst}/${student}/${category}/${docId}${ext}`;
}
async function uploadArchiveDocumentToStorage(client, doc, fileDataBase64) {
  try {
    const { bytes, detectedMime } = decodeBase64ToBytes(fileDataBase64);
    if (!bytes || bytes.byteLength === 0) {
      return {
        success: false,
        storageBucket: STUDENT_DOCS_BUCKET,
        error: "Conte\xFAdo do ficheiro vazio."
      };
    }
    const mimeType = doc.mimeType || detectedMime || "application/octet-stream";
    const storagePath = buildStudentStoragePath({ ...doc, mimeType });
    const { error: uploadErr } = await client.storage.from(STUDENT_DOCS_BUCKET).upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: true
    });
    if (uploadErr) {
      return {
        success: false,
        storageBucket: STUDENT_DOCS_BUCKET,
        error: uploadErr.message
      };
    }
    const { data: signedData } = await client.storage.from(STUDENT_DOCS_BUCKET).createSignedUrl(storagePath, 3600);
    const { data: pub } = client.storage.from(STUDENT_DOCS_BUCKET).getPublicUrl(storagePath);
    return {
      success: true,
      storageBucket: STUDENT_DOCS_BUCKET,
      storagePath,
      fileUrl: signedData?.signedUrl || pub?.publicUrl
    };
  } catch (err) {
    return {
      success: false,
      storageBucket: STUDENT_DOCS_BUCKET,
      error: err?.message || "Erro ao enviar documento para o Supabase Storage."
    };
  }
}
async function getSignedArchiveUrlFromStorage(client, storagePath, bucket = STUDENT_DOCS_BUCKET, expiresInSeconds = 3600, downloadFileName) {
  if (!storagePath) {
    return { success: false, error: "Caminho de ficheiro em falta." };
  }
  try {
    const { data, error } = await client.storage.from(bucket || STUDENT_DOCS_BUCKET).createSignedUrl(
      storagePath,
      expiresInSeconds,
      downloadFileName ? { download: downloadFileName } : void 0
    );
    if (error || !data?.signedUrl) {
      return { success: false, error: error?.message || "N\xE3o foi poss\xEDvel gerar URL assinado." };
    }
    return { success: true, signedUrl: data.signedUrl };
  } catch (err) {
    return { success: false, error: err?.message || "Erro ao gerar URL assinado." };
  }
}
async function deleteArchiveDocumentFromStorage(client, storagePath, bucket = STUDENT_DOCS_BUCKET) {
  if (!storagePath) return { success: true };
  try {
    const { error } = await client.storage.from(bucket || STUDENT_DOCS_BUCKET).remove([storagePath]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || "Erro ao remover ficheiro do Supabase Storage." };
  }
}
async function checkSupabaseTablesHealth(rawUrl, anonKey, authOrToken) {
  let normalizedUrl = "";
  try {
    normalizedUrl = normalizeSupabaseUrl(rawUrl);
  } catch (err) {
    return {
      success: false,
      message: err?.message || "URL do Supabase inv\xE1lido.",
      normalizedUrl: "",
      tablesReady: 0,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: NEUROEDUCA_ENTITY_TABLES.map((t) => t.table),
      tableDetails: []
    };
  }
  if (!anonKey || !anonKey.trim()) {
    return {
      success: false,
      message: "Forne\xE7a a chave p\xFAblica (anon / publishable key) do Supabase.",
      normalizedUrl,
      tablesReady: 0,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: NEUROEDUCA_ENTITY_TABLES.map((t) => t.table),
      tableDetails: []
    };
  }
  try {
    const client = createValidatedSupabaseClient(normalizedUrl, anonKey, authOrToken);
    const details = await Promise.all(
      NEUROEDUCA_ENTITY_TABLES.map(async (item) => {
        const { count, error } = await client.from(item.table).select("id", { count: "exact", head: true });
        if (error) {
          if (isTableMissingError(error)) {
            return {
              key: item.key,
              table: item.table,
              label: item.label,
              exists: false,
              rowCount: 0,
              error: "Tabela ainda n\xE3o criada"
            };
          }
          if (isPermissionDeniedError(error)) {
            return {
              key: item.key,
              table: item.table,
              label: item.label,
              exists: true,
              rowCount: 0
            };
          }
          return {
            key: item.key,
            table: item.table,
            label: item.label,
            exists: false,
            rowCount: 0,
            error: error.message
          };
        }
        return {
          key: item.key,
          table: item.table,
          label: item.label,
          exists: true,
          rowCount: count || 0
        };
      })
    );
    const missingTables = details.filter((d) => !d.exists).map((d) => d.table);
    const tablesReady = details.filter((d) => d.exists).length;
    const authErrors = details.filter(
      (d) => d.error && d.error !== "Tabela ainda n\xE3o criada" && (d.error.toLowerCase().includes("invalid api key") || d.error.toLowerCase().includes("jwt") || d.error.toLowerCase().includes("unauthorized"))
    );
    const { error: storageErr } = await client.storage.from(STUDENT_DOCS_BUCKET).list("", { limit: 1 });
    const storageErrMsg = String(storageErr?.message || "").toLowerCase();
    const isPrivateBucketRlsResponse = Boolean(storageErr) && !storageErrMsg.includes("not found") && !storageErrMsg.includes("does not exist") && (storageErrMsg.includes("row-level security") || storageErrMsg.includes("permission") || storageErrMsg.includes("unauthorized") || storageErrMsg.includes("403") || storageErrMsg.includes("42501"));
    const storageBucketReady = !storageErr || isPrivateBucketRlsResponse;
    const storageBucketError = storageBucketReady ? void 0 : storageErr?.message;
    if (authErrors.length > 0) {
      return {
        success: false,
        message: `Chave API ou permiss\xE3o rejeitada pelo Supabase: ${authErrors[0].error}`,
        normalizedUrl,
        tablesReady,
        totalTables: NEUROEDUCA_ENTITY_TABLES.length,
        missingTables,
        tableDetails: details,
        storageBucketReady,
        storageBucketName: STUDENT_DOCS_BUCKET,
        storageBucketError
      };
    }
    if (tablesReady === 0) {
      return {
        success: true,
        message: `Liga\xE7\xE3o ao projecto Supabase verificada com sucesso! Falta apenas executar o Script SQL de cria\xE7\xE3o das ${NEUROEDUCA_ENTITY_TABLES.length} tabelas e Storage no SQL Editor do Supabase.`,
        normalizedUrl,
        tablesReady,
        totalTables: NEUROEDUCA_ENTITY_TABLES.length,
        missingTables,
        tableDetails: details,
        storageBucketReady,
        storageBucketName: STUDENT_DOCS_BUCKET,
        storageBucketError
      };
    }
    if (missingTables.length > 0) {
      return {
        success: true,
        message: `Conectado ao Supabase (${tablesReady}/${NEUROEDUCA_ENTITY_TABLES.length} tabelas prontas). Execute o Script SQL actualizado para criar as ${missingTables.length} tabelas em falta.`,
        normalizedUrl,
        tablesReady,
        totalTables: NEUROEDUCA_ENTITY_TABLES.length,
        missingTables,
        tableDetails: details,
        storageBucketReady,
        storageBucketName: STUDENT_DOCS_BUCKET,
        storageBucketError
      };
    }
    return {
      success: true,
      message: storageBucketReady ? `Conex\xE3o total estabelecida! Todas as ${tablesReady} tabelas e o bucket "${STUDENT_DOCS_BUCKET}" est\xE3o activos no Supabase.` : `Tabelas activas (${tablesReady}/${NEUROEDUCA_ENTITY_TABLES.length}). Execute o Script SQL actualizado para criar o bucket "${STUDENT_DOCS_BUCKET}" no Supabase Storage.`,
      normalizedUrl,
      tablesReady,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: [],
      tableDetails: details,
      storageBucketReady,
      storageBucketName: STUDENT_DOCS_BUCKET,
      storageBucketError
    };
  } catch (err) {
    return {
      success: false,
      message: `Erro ao testar conex\xE3o Supabase: ${err?.message || "Verifique o URL e a chave."}`,
      normalizedUrl,
      tablesReady: 0,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: NEUROEDUCA_ENTITY_TABLES.map((t) => t.table),
      tableDetails: [],
      storageBucketReady: false,
      storageBucketName: STUDENT_DOCS_BUCKET
    };
  }
}
function buildFkLookupSets(bundle) {
  const b = bundle;
  const makeSet = (arr, mapFn) => {
    if (!Array.isArray(arr) || arr.length === 0) return void 0;
    const set = /* @__PURE__ */ new Set();
    for (const item of arr) {
      const val = mapFn(item);
      if (val) set.add(val);
    }
    return set.size > 0 ? set : void 0;
  };
  return {
    institutionIds: makeSet(b.institutions, (i) => i?.id ? String(i.id) : null),
    teacherIds: makeSet(b.teachers, (i) => i?.id ? String(i.id) : null),
    classIds: makeSet(b.classes, (i) => i?.id ? String(i.id) : null),
    studentIds: makeSet(b.students, (i) => i?.id ? String(i.id) : null),
    invoiceIds: makeSet(b.invoices, (i) => i?.id ? String(i.id) : null),
    accountIds: makeSet(b.accounts, (i) => {
      const e = String(i?.email || "").trim().toLowerCase();
      return e || null;
    })
  };
}
function sanitizeNullableFk(rawValue, validSet, invalidTokens = ["", "municipal"]) {
  const trimmed = String(rawValue ?? "").trim();
  if (!trimmed || invalidTokens.includes(trimmed)) return null;
  if (validSet && !validSet.has(trimmed)) return null;
  return trimmed;
}
function buildRowForEntity(key, item, nowIso, fkLookup = {}) {
  if (!item) return null;
  switch (key) {
    case "institutions":
      return {
        id: String(item.id),
        code: item.code || String(item.id),
        name: item.name || "Institui\xE7\xE3o",
        acronym: item.acronym || null,
        nif: item.nif || null,
        institution_type: item.institutionType || "privada",
        category: item.category || "complexo_escolar",
        province: item.province || null,
        municipality: item.municipality || null,
        status: item.status || "active",
        max_classes: Number(item.maxClasses || 20),
        current_classes_count: Number(item.currentClassesCount || 0),
        current_students_count: Number(item.currentStudentsCount || 0),
        current_teachers_count: Number(item.currentTeachersCount || 0),
        payload: item,
        updated_at: nowIso
      };
    case "classes":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        code: item.code || null,
        name: item.name || "Turma",
        subsystem_code: item.subsystemCode || null,
        grade_level: item.gradeLevel || null,
        shift: item.shift || null,
        room: item.room || null,
        academic_year: item.academicYear || null,
        max_capacity: Number(item.maxCapacity || 45),
        enrolled_students_count: Number(item.enrolledStudentsCount || 0),
        status: item.status || "aberta",
        payload: item,
        updated_at: nowIso
      };
    case "subjects":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        code: item.code || null,
        name: item.name || "Disciplina",
        short_name: item.shortName || null,
        subsystem_code: item.subsystemCode || null,
        grade_level: item.gradeLevel || null,
        teacher_id: sanitizeNullableFk(item.teacherId, fkLookup.teacherIds, [""]),
        teacher_name: item.teacherName || null,
        status: item.status || "activa",
        payload: item,
        updated_at: nowIso
      };
    case "students":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        class_id: sanitizeNullableFk(item.classId, fkLookup.classIds, [""]),
        process_number: item.processNumber || null,
        full_name: item.fullName || "Aluno",
        gender: item.gender || null,
        birth_date: item.birthDate || null,
        identity_card_number: item.identityCardNumber || null,
        guardian_name: item.guardianName || null,
        guardian_phone: item.guardianPhone || null,
        academic_status: item.academicStatus || "matriculado",
        payload: item,
        updated_at: nowIso
      };
    case "teachers":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        staff_code: item.staffCode || null,
        full_name: item.fullName || "Docente",
        academic_degree: item.academicDegree || null,
        specialization: item.specialization || null,
        email: item.email || null,
        phone: item.phone || null,
        is_active: item.isActive !== false,
        payload: item,
        updated_at: nowIso
      };
    case "grades":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        student_id: String(item.studentId || ""),
        class_id: String(item.classId || ""),
        subject_id: String(item.subjectId || ""),
        subject_name: item.subjectName || null,
        period: item.period || "1_trimestre",
        ac1: item.ac1 ?? null,
        ac2: item.ac2 ?? null,
        ac3: item.ac3 ?? null,
        mac: item.mac ?? null,
        npt: item.npt ?? null,
        mt: item.mt ?? null,
        exam_normal: item.examNormal ?? null,
        exam_recourse: item.examRecourse ?? null,
        final_grade: item.finalGrade ?? null,
        result_status: item.resultStatus || null,
        payload: item,
        updated_at: nowIso
      };
    case "invoices":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        student_id: String(item.studentId || ""),
        invoice_number: item.invoiceNumber || String(item.id),
        category: item.category || "propina",
        month_reference: item.monthReference || null,
        description: item.description || null,
        total_aoa: Number(item.totalAoa || 0),
        amount_paid_aoa: Number(item.amountPaidAoa || 0),
        balance_aoa: Number(item.balanceAoa || 0),
        due_date: item.dueDate || null,
        status: item.status || "pendente",
        multicaixa_reference: item.multicaixaReference || null,
        receipt_number: item.receiptNumber || null,
        payload: item,
        updated_at: nowIso
      };
    case "attendance":
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        student_id: String(item.studentId || ""),
        class_id: String(item.classId || ""),
        attendance_date: item.date || "",
        month_reference: item.month || null,
        status: item.status || "presente",
        justification_status: item.justificationStatus || null,
        payload: item,
        updated_at: nowIso
      };
    case "digitalArchive": {
      const hasStorage = Boolean(item.storagePath);
      const sanitizedPayload = hasStorage || item.dataUrl && String(item.dataUrl).length > 18e4 ? { ...item, dataUrl: void 0 } : item;
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        student_id: String(item.studentId || ""),
        document_type: item.category || null,
        title: item.title || "Documento",
        file_name: item.fileName || null,
        mime_type: item.mimeType || null,
        file_size_bytes: item.fileSizeBytes ? Number(item.fileSizeBytes) : null,
        storage_bucket: item.storageBucket || STUDENT_DOCS_BUCKET,
        storage_path: item.storagePath || null,
        file_url: item.fileUrl || null,
        status: item.status || "pendente",
        uploaded_at: item.uploadedAt || null,
        payload: sanitizedPayload,
        updated_at: nowIso
      };
    }
    case "financialNotifications":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        student_id: String(item.studentId || ""),
        invoice_id: sanitizeNullableFk(item.invoiceId, fkLookup.invoiceIds, [""]),
        recipient_target: item.recipientTarget || null,
        notification_type: item.type || null,
        title: item.title || "Notifica\xE7\xE3o Financeira",
        message: item.message || null,
        amount_aoa: item.amountAoa ?? null,
        is_read: Boolean(item.isRead),
        sent_at: item.sentAt || null,
        payload: item,
        updated_at: nowIso
      };
    case "announcements":
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        channel: item.channel || "school_to_members",
        sender_role: item.senderRole || null,
        sender_name: item.senderName || null,
        target_scope: item.targetScope || null,
        priority: item.priority || "normal",
        category: item.category || "geral",
        title: item.title || "Comunicado",
        content: item.content || null,
        published_at: item.createdAt || null,
        payload: item,
        updated_at: nowIso
      };
    case "schoolUsers": {
      const cleanEmail = String(item.email || "").trim().toLowerCase();
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        account_id: sanitizeNullableFk(cleanEmail, fkLookup.accountIds, [""]),
        full_name: item.fullName || "Utilizador",
        email: cleanEmail,
        role: item.role || "professor",
        municipality: item.municipality || null,
        province: item.province || null,
        status: item.status || "activo",
        payload: { ...item, email: cleanEmail },
        updated_at: nowIso
      };
    }
    case "accounts": {
      const cleanEmail = String(item.email || "").trim().toLowerCase();
      if (!cleanEmail) return null;
      return {
        id: cleanEmail,
        email: cleanEmail,
        full_name: item.fullName || cleanEmail,
        role: item.role || "aluno",
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        municipality: item.municipality || null,
        province: item.province || null,
        status: item.status || "activo",
        payload: { ...item, email: cleanEmail },
        updated_at: nowIso
      };
    }
    case "subscriptionPlans":
      return {
        id: String(item.id),
        name: item.name || "Plano",
        cycle: item.cycle || "mensal",
        price_aoa: Number(item.priceAoa || 0),
        max_classes: Number(item.maxClasses || 20),
        is_active: item.isActive !== false,
        payload: item,
        updated_at: nowIso
      };
    case "auditLogs":
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        user_name: item.userName || null,
        user_role: item.userRole || null,
        action: item.action || "EVENTO",
        details: item.details || null,
        timestamp_str: item.timestamp || null,
        payload: item,
        updated_at: nowIso
      };
    case "psychopedagogicalProtocols":
      return {
        id: String(item.id),
        code: item.code || null,
        title: item.title || "Protocolo Psicopedag\xF3gico",
        category: item.category || null,
        target_subsystem: Array.isArray(item.targetSubsystems) ? item.targetSubsystems.join(", ") : null,
        is_active: item.isActive !== false,
        payload: item,
        updated_at: nowIso
      };
    case "psychopedagogicalCases":
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ""),
        student_id: sanitizeNullableFk(item.studentId, fkLookup.studentIds, [""]),
        case_code: item.caseCode || null,
        student_name: item.studentName || "Aluno",
        status: item.status || "em_triagem",
        risk_level: item.priority || null,
        payload: item,
        updated_at: nowIso
      };
    default:
      return null;
  }
}
async function upsertInBatches(client, table, rows, batchSize = 200) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await client.from(table).upsert(chunk, { onConflict: "id" });
    if (error) return error;
  }
  return null;
}
async function deleteIdsInBatches(client, table, ids, batchSize = 100) {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const chunk = uniqueIds.slice(i, i + batchSize);
    const { error } = await client.from(table).delete().in("id", chunk);
    if (error) return error;
  }
  return null;
}
async function updateSyncMetaSafe(client, syncedAt, summary, appVersion = "3.0") {
  const { error: metaErr } = await client.from("neuroeduca_sync_meta").upsert(
    {
      id: "primary",
      last_pushed_at: syncedAt,
      app_version: appVersion,
      summary,
      updated_at: syncedAt
    },
    { onConflict: "id" }
  );
  return Boolean(metaErr && isTableMissingError(metaErr));
}
async function syncChangesToSupabase(client, batch) {
  const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
  const errors = [];
  let syncedCount = 0;
  let deletedCount = 0;
  const fkLookup = buildFkLookupSets({
    ...batch.fkContext || {},
    ...batch.upserts || {}
  });
  if (batch.upserts) {
    for (const def of NEUROEDUCA_ENTITY_TABLES) {
      let list = batch.upserts[def.key];
      if (!Array.isArray(list) || list.length === 0) continue;
      if (def.key === "digitalArchive") {
        const migratedList = [];
        for (const item of list) {
          if (item && item.dataUrl && !item.storagePath) {
            const uploadRes = await uploadArchiveDocumentToStorage(client, item, item.dataUrl);
            if (uploadRes.success && uploadRes.storagePath && uploadRes.fileUrl) {
              migratedList.push({
                ...item,
                storageBucket: uploadRes.storageBucket,
                storagePath: uploadRes.storagePath,
                fileUrl: uploadRes.fileUrl,
                dataUrl: void 0
              });
              continue;
            }
          }
          migratedList.push(item);
        }
        list = migratedList;
      }
      const rows = list.map((item) => buildRowForEntity(def.key, item, syncedAt, fkLookup)).filter((r) => r !== null);
      if (rows.length === 0) continue;
      const err = await upsertInBatches(client, def.table, rows);
      if (err) {
        errors.push(`${def.label} (${def.table}): ${err.message}`);
      } else {
        syncedCount += rows.length;
      }
    }
  }
  if (batch.deletes) {
    const reverseDefs = [...NEUROEDUCA_ENTITY_TABLES].reverse();
    for (const def of reverseDefs) {
      const rawIds = batch.deletes[def.key];
      if (!Array.isArray(rawIds) || rawIds.length === 0) continue;
      const normalizedIds = def.key === "accounts" ? rawIds.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean) : rawIds.map((id) => String(id || "").trim()).filter(Boolean);
      if (normalizedIds.length === 0) continue;
      const err = await deleteIdsInBatches(client, def.table, normalizedIds);
      if (err) {
        if (!isTableMissingError(err)) {
          errors.push(`Eliminar ${def.label} (${def.table}): ${err.message}`);
        }
      } else {
        deletedCount += normalizedIds.length;
      }
    }
  }
  if (syncedCount > 0 || deletedCount > 0) {
    await updateSyncMetaSafe(client, syncedAt, { syncedCount, deletedCount });
  }
  return {
    success: errors.length === 0,
    syncedCount,
    deletedCount,
    errors,
    syncedAt
  };
}
async function pushBundleToSupabase(client, bundle, options) {
  const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
  const errors = [];
  const missingTables = [];
  const tableCounts = {};
  const fkLookup = buildFkLookupSets(bundle);
  let syncedCount = 0;
  let deletedCount = 0;
  for (const def of NEUROEDUCA_ENTITY_TABLES) {
    let list = bundle[def.key];
    if (!Array.isArray(list)) {
      list = [];
    }
    if (list.length > 0) {
      if (def.key === "digitalArchive") {
        const migratedList = [];
        for (const item of list) {
          if (item && item.dataUrl && !item.storagePath) {
            const uploadRes = await uploadArchiveDocumentToStorage(client, item, item.dataUrl);
            if (uploadRes.success && uploadRes.storagePath && uploadRes.fileUrl) {
              migratedList.push({
                ...item,
                storageBucket: uploadRes.storageBucket,
                storagePath: uploadRes.storagePath,
                fileUrl: uploadRes.fileUrl,
                dataUrl: void 0
              });
              continue;
            }
          }
          migratedList.push(item);
        }
        list = migratedList;
      }
      const rows = list.map((item) => buildRowForEntity(def.key, item, syncedAt, fkLookup)).filter((r) => r !== null);
      if (rows.length > 0) {
        const error = await upsertInBatches(client, def.table, rows);
        if (error) {
          if (isTableMissingError(error)) {
            missingTables.push(def.table);
          } else {
            errors.push(`${def.label} (${def.table}): ${error.message}`);
          }
          tableCounts[def.table] = 0;
        } else {
          tableCounts[def.table] = rows.length;
          syncedCount += rows.length;
        }
      } else {
        tableCounts[def.table] = 0;
      }
    } else {
      tableCounts[def.table] = 0;
    }
  }
  if (options?.pruneMissing) {
    const reverseDefs = [...NEUROEDUCA_ENTITY_TABLES].reverse();
    for (const def of reverseDefs) {
      if (missingTables.includes(def.table)) continue;
      const list = bundle[def.key];
      if (!Array.isArray(list)) continue;
      const localIdSet = new Set(
        list.map((item) => {
          if (def.key === "accounts") {
            return String(item?.email || "").trim().toLowerCase();
          }
          return String(item?.id || "").trim();
        }).filter(Boolean)
      );
      const { data: remoteRows, error: fetchErr } = await client.from(def.table).select("id").limit(5e3);
      if (fetchErr) {
        if (!isTableMissingError(fetchErr) && !isPermissionDeniedError(fetchErr)) {
          errors.push(`Reconciliar ${def.label} (${def.table}): ${fetchErr.message}`);
        }
        continue;
      }
      const staleIds = (remoteRows || []).map((r) => String(r?.id || "").trim()).filter((id) => Boolean(id) && !localIdSet.has(id));
      if (staleIds.length > 0) {
        const delErr = await deleteIdsInBatches(client, def.table, staleIds);
        if (delErr) {
          if (!isPermissionDeniedError(delErr)) {
            errors.push(`Limpar ${def.label} (${def.table}): ${delErr.message}`);
          }
        } else {
          deletedCount += staleIds.length;
        }
      }
    }
  }
  const metaMissing = await updateSyncMetaSafe(
    client,
    syncedAt,
    tableCounts,
    bundle.version || "3.0"
  );
  if (metaMissing) {
    missingTables.push("neuroeduca_sync_meta");
  }
  if (missingTables.length > 0) {
    errors.unshift(
      `${missingTables.length} tabela(s) ainda n\xE3o existem no Supabase (${missingTables.slice(0, 3).join(", ")}${missingTables.length > 3 ? "..." : ""}). Execute o Script SQL de integra\xE7\xE3o na Aba 2.`
    );
  }
  return {
    success: errors.length === 0 && missingTables.length === 0,
    syncedCount,
    deletedCount,
    tableCounts,
    missingTables,
    errors,
    syncedAt
  };
}
async function pullBundleFromSupabase(client) {
  const pulledAt = (/* @__PURE__ */ new Date()).toISOString();
  const errors = [];
  const missingTables = [];
  const tableCounts = {};
  const bundle = {};
  let pulledCount = 0;
  let cloudUpdatedAt;
  const { data: metaRow, error: metaErr } = await client.from("neuroeduca_sync_meta").select("last_pushed_at, app_version").eq("id", "primary").maybeSingle();
  if (metaErr) {
    if (isTableMissingError(metaErr)) {
      missingTables.push("neuroeduca_sync_meta");
    }
  } else if (metaRow?.last_pushed_at) {
    cloudUpdatedAt = metaRow.last_pushed_at;
  }
  for (const def of NEUROEDUCA_ENTITY_TABLES) {
    const { data, error } = await client.from(def.table).select("payload, updated_at").limit(5e3);
    if (error) {
      if (isTableMissingError(error)) {
        missingTables.push(def.table);
      } else {
        errors.push(`${def.label} (${def.table}): ${error.message}`);
      }
      tableCounts[def.table] = 0;
      continue;
    }
    const items = (data || []).map((row) => row?.payload).filter((p) => p !== null && p !== void 0);
    bundle[def.key] = items;
    tableCounts[def.table] = items.length;
    pulledCount += items.length;
  }
  if (missingTables.length > 0) {
    errors.unshift(
      `${missingTables.length} tabela(s) ainda n\xE3o existem no Supabase. Execute o Script SQL na Aba 2 para inicializar o banco.`
    );
  }
  const allSucceeded = errors.length === 0 && missingTables.length === 0;
  return {
    success: allSucceeded,
    bundle: allSucceeded || pulledCount > 0 ? bundle : null,
    pulledCount,
    tableCounts,
    missingTables,
    errors,
    pulledAt,
    cloudUpdatedAt
  };
}

// server.ts
dotenv.config();
var SERVER_ROOT_DIR = (() => {
  try {
    if (typeof import.meta !== "undefined" && typeof import.meta.url === "string" && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
  }
  return process.cwd();
})();
var app = express();
app.set("trust proxy", 1);
var PORT = 3e3;
app.use(express.json({ limit: "25mb" }));
var apiKey = process.env.GEMINI_API_KEY || "";
var aiClient = null;
async function getGeminiClient() {
  if (!apiKey) return null;
  if (!aiClient) {
    const { GoogleGenAI } = await import("@google/genai");
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var IS_VERCEL = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL || process.env.NETLIFY || process.env.NETLIFY_LOCAL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
var SESSION_COOKIE_NAME = "ne_session";
var SESSION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;
var runtimeServerSupabaseConfig = null;
function parseCookies(req) {
  const raw = String(req.headers.cookie || "");
  const out = {};
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (name) {
      try {
        out[name] = decodeURIComponent(val);
      } catch {
        out[name] = val;
      }
    }
  }
  return out;
}
function readSessionCookie(req) {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return null;
  try {
    const jsonStr = Buffer.from(raw, "base64url").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.sessionToken && !parsed.accessToken) return null;
    return {
      sessionToken: parsed.sessionToken ? String(parsed.sessionToken).trim() : void 0,
      accessToken: parsed.accessToken ? String(parsed.accessToken).trim() : void 0
    };
  } catch {
    return null;
  }
}
function getNormalizedRequestHost(req) {
  const raw = String(req.get("x-forwarded-host") || req.get("host") || "");
  return raw.split(",")[0].trim().toLowerCase();
}
function buildCookieAttributes(req, maxAgeSeconds) {
  const host = getNormalizedRequestHost(req);
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = String(req.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  const isHttps = req.secure || proto === "https";
  const attrs = ["Path=/", "HttpOnly", `Max-Age=${maxAgeSeconds}`];
  if (isHttps || isLocal) {
    attrs.push("Secure", "SameSite=None", "Partitioned");
  } else {
    attrs.push("SameSite=Lax");
  }
  return attrs;
}
function setSessionCookie(req, res, tokens) {
  const encoded = Buffer.from(JSON.stringify(tokens), "utf-8").toString("base64url");
  const attrs = buildCookieAttributes(req, SESSION_COOKIE_MAX_AGE_SEC);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=${encoded}; ${attrs.join("; ")}`);
}
function clearSessionCookie(req, res) {
  const attrs = buildCookieAttributes(req, 0);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; ${attrs.join("; ")}`);
}
function isValidMutationOrigin(req) {
  const customHeader = String(req.headers["x-requested-with"] || "");
  if (customHeader !== "NEUROEDUCA") {
    return false;
  }
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = getNormalizedRequestHost(req);
    return Boolean(originHost && requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    platform: "NEUROEDUCA - Angola",
    geminiEnabled: Boolean(apiKey),
    persistenceMode: "supabase_only",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var cachedInsignia = null;
app.get("/api/insignia", async (_req, res) => {
  if (cachedInsignia) {
    res.setHeader("Content-Type", cachedInsignia.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(cachedInsignia.buffer);
  }
  const remoteUrls = [
    "https://luanda.gov.ao/themes/portalweb/assets/insignia.png",
    "https://th.bing.com/th/id/R.ee6fee60d1fa04392c3c3573275bfde8?rik=gDE%2fatTNFOr1eQ&pid=ImgRaw&r=0"
  ];
  for (const url of remoteUrls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5e3) });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const contentType = response.headers.get("content-type") || "image/png";
        cachedInsignia = { buffer, contentType };
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(buffer);
      }
    } catch {
    }
  }
  const localFallbackCandidates = [
    path.join(process.cwd(), "public", "assets", "aistudio", "IMG-20261010-WA0062_2b38905c.jpg"),
    path.join(SERVER_ROOT_DIR, "public", "assets", "aistudio", "IMG-20261010-WA0062_2b38905c.jpg")
  ];
  for (const localFallback of localFallbackCandidates) {
    if (fs.existsSync(localFallback)) {
      const buffer = fs.readFileSync(localFallback);
      cachedInsignia = { buffer, contentType: "image/jpeg" };
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(buffer);
    }
  }
  return res.status(404).end();
});
var ARCHIVE_DIR = IS_VERCEL ? path.join(os.tmpdir(), ".neuroeduca_archive") : path.join(SERVER_ROOT_DIR, ".neuroeduca_archive");
function ensureArchiveDir() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}
function getSafeArchiveId(rawId) {
  return rawId.replace(/[^a-zA-Z0-9_-]/g, "");
}
function getExtensionFromMimeOrName(mimeType, fileName) {
  const extFromName = path.extname(fileName || "").toLowerCase();
  if (extFromName && /^[a-z0-9.]+$/i.test(extFromName)) {
    return extFromName;
  }
  const map = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };
  return map[mimeType] || ".bin";
}
function escapeXml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function getSavedServerSupabaseConfig() {
  return runtimeServerSupabaseConfig;
}
function persistServerSupabaseConfig(url, anonKey, autoSync = true) {
  const normalizedUrl = normalizeSupabaseUrl(url);
  const cleanKey = String(anonKey || "").trim();
  if (!normalizedUrl || !cleanKey) return null;
  const nextConfig = {
    url: normalizedUrl,
    anonKey: cleanKey,
    autoSync: Boolean(autoSync),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  runtimeServerSupabaseConfig = nextConfig;
  return nextConfig;
}
function resolveSupabaseCredentials(body) {
  const envUrl = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
  ).trim();
  const envKey = String(
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  ).trim();
  const saved = getSavedServerSupabaseConfig();
  const rawUrl = String(body?.url || envUrl || saved?.url || "").trim();
  const rawKey = String(body?.anonKey || envKey || saved?.anonKey || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!rawUrl || !rawKey) {
    return { configured: false, url: "", anonKey: "", serviceRoleKey: "" };
  }
  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  return {
    configured: true,
    url: normalizedUrl,
    anonKey: rawKey,
    serviceRoleKey
  };
}
function extractBearerToken(req) {
  const auth = String(req?.headers?.authorization || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  if (req) {
    return readSessionCookie(req)?.accessToken;
  }
  return void 0;
}
function extractSessionToken(req) {
  const headerToken = String(req?.headers?.["x-ne-session"] || "").trim();
  if (headerToken) return headerToken;
  if (req) {
    return readSessionCookie(req)?.sessionToken;
  }
  return void 0;
}
function createServerSupabaseClient(creds, req) {
  if (creds.serviceRoleKey) {
    return createValidatedSupabaseClient(creds.url, creds.serviceRoleKey);
  }
  return createValidatedSupabaseClient(creds.url, creds.anonKey, {
    accessToken: extractBearerToken(req),
    sessionToken: extractSessionToken(req)
  });
}
async function resolveAuthenticatedSessionFromTokens(creds, tokens) {
  if (tokens.sessionToken) {
    const sessionClient = createValidatedSupabaseClient(creds.url, creds.anonKey, {
      sessionToken: tokens.sessionToken,
      accessToken: tokens.accessToken
    });
    const { data, error } = await sessionClient.rpc("get_neuroeduca_session_profile");
    if (!error && data && data.authenticated && data.account) {
      return { authenticated: true, account: data.account };
    }
  }
  if (tokens.accessToken) {
    const authClient = createValidatedSupabaseClient(creds.url, creds.anonKey, {
      accessToken: tokens.accessToken
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(tokens.accessToken);
    if (!userErr && userData?.user?.email) {
      const cleanEmail = userData.user.email.toLowerCase();
      const { data: accountRow } = await authClient.from("neuroeduca_accounts").select("email, full_name, role, institution_id, municipality, province, status, payload").eq("id", cleanEmail).maybeSingle();
      const payload = accountRow?.payload || {};
      const status = String(accountRow?.status || payload.status || "activo");
      if (status === "inactivo") {
        return { authenticated: false };
      }
      const meta = userData.user.user_metadata || {};
      return {
        authenticated: true,
        account: {
          email: accountRow?.email || cleanEmail,
          fullName: accountRow?.full_name || payload.fullName || meta.full_name || meta.fullName || cleanEmail,
          role: accountRow?.role || payload.role || meta.role || "director_geral",
          institutionId: accountRow?.institution_id || payload.institutionId || meta.institution_id || void 0,
          institutionName: payload.institutionName || void 0,
          municipality: accountRow?.municipality || payload.municipality || meta.municipality || void 0,
          province: accountRow?.province || payload.province || meta.province || void 0,
          status: "activo"
        }
      };
    }
  }
  return { authenticated: false };
}
app.post("/api/session", async (req, res) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ ok: false, message: "Origem de pedido n\xE3o autorizada." });
  }
  const sessionToken = req.body?.sessionToken ? String(req.body.sessionToken).trim() : void 0;
  const accessToken = req.body?.accessToken ? String(req.body.accessToken).trim() : void 0;
  if (!sessionToken && !accessToken) {
    return res.status(400).json({ ok: false, message: "Token de sess\xE3o em falta." });
  }
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(503).json({ ok: false, message: "Supabase n\xE3o configurado." });
    }
    const verified = await resolveAuthenticatedSessionFromTokens(creds, {
      sessionToken,
      accessToken
    });
    if (!verified.authenticated) {
      return res.status(401).json({ ok: false, message: "Sess\xE3o inv\xE1lida ou expirada." });
    }
    setSessionCookie(req, res, { sessionToken, accessToken });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || "Erro ao validar sess\xE3o." });
  }
});
app.get("/api/session/me", async (req, res) => {
  const cookieTokens = readSessionCookie(req);
  if (!cookieTokens) {
    return res.json({ authenticated: false });
  }
  try {
    const creds = resolveSupabaseCredentials();
    if (!creds.configured) {
      return res.json({ authenticated: false });
    }
    const verified = await resolveAuthenticatedSessionFromTokens(creds, cookieTokens);
    if (!verified.authenticated || !verified.account) {
      clearSessionCookie(req, res);
      return res.json({ authenticated: false });
    }
    return res.json({
      authenticated: true,
      account: verified.account,
      ...cookieTokens.sessionToken ? { sessionToken: cookieTokens.sessionToken } : {},
      ...cookieTokens.accessToken ? { accessToken: cookieTokens.accessToken } : {}
    });
  } catch {
    return res.json({ authenticated: false });
  }
});
app.post("/api/session/logout", async (req, res) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ ok: false, message: "Origem de pedido n\xE3o autorizada." });
  }
  const logoutToken = extractSessionToken(req);
  if (logoutToken) {
    try {
      const creds = resolveSupabaseCredentials(req.body);
      if (creds.configured) {
        const client = createValidatedSupabaseClient(creds.url, creds.anonKey, {
          sessionToken: logoutToken
        });
        await client.rpc("logout_neuroeduca_session", { p_token: logoutToken });
      }
    } catch {
    }
  }
  clearSessionCookie(req, res);
  return res.json({ ok: true });
});
app.get("/api/supabase/status", (_req, res) => {
  try {
    const rawEnvUrl = String(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
    ).trim();
    const rawEnvKey = String(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    ).trim();
    const saved = getSavedServerSupabaseConfig();
    const configuredViaEnv = Boolean(rawEnvUrl && rawEnvKey);
    const activeUrl = rawEnvUrl || saved?.url || "";
    const activeKey = rawEnvKey || saved?.anonKey || "";
    if (!activeUrl || !activeKey) {
      return res.json({
        serverConfigured: false,
        configuredViaEnv: false,
        urlHost: null,
        normalizedUrl: "",
        publicUrl: "",
        publicAnonKey: ""
      });
    }
    const normalizedUrl = normalizeSupabaseUrl(activeUrl);
    const parsed = new URL(normalizedUrl);
    return res.json({
      serverConfigured: true,
      configuredViaEnv,
      urlHost: parsed.hostname,
      normalizedUrl,
      publicUrl: normalizedUrl,
      publicAnonKey: activeKey
    });
  } catch (err) {
    return res.json({
      serverConfigured: false,
      configuredViaEnv: false,
      urlHost: null,
      normalizedUrl: "",
      publicUrl: "",
      publicAnonKey: "",
      error: err?.message || "Configura\xE7\xE3o Supabase inv\xE1lida no servidor."
    });
  }
});
app.get("/api/supabase/bootstrap-status", async (_req, res) => {
  try {
    const creds = resolveSupabaseCredentials();
    if (!creds.configured) {
      return res.json({ hasAccounts: true, bootstrapRequired: false, cloudUnavailable: true });
    }
    const anonClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data, error } = await anonClient.rpc("check_neuroeduca_bootstrap_status");
    if (error || !data) {
      return res.json({ hasAccounts: true, bootstrapRequired: false });
    }
    return res.json({
      hasAccounts: Boolean(data.hasAccounts),
      bootstrapRequired: Boolean(data.bootstrapRequired)
    });
  } catch {
    return res.json({ hasAccounts: true, bootstrapRequired: false });
  }
});
app.post("/api/supabase/bootstrap-super-admin", async (req, res) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ authenticated: false, error: "Origem n\xE3o autorizada." });
  }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const fullName = String(req.body?.fullName || "").trim();
    const password = String(req.body?.password || "").trim();
    if (!email || !fullName || !password) {
      return res.status(400).json({ authenticated: false, error: "Dados obrigat\xF3rios em falta." });
    }
    const creds = resolveSupabaseCredentials();
    if (!creds.configured) {
      return res.status(503).json({ authenticated: false, error: "Supabase n\xE3o configurado." });
    }
    const anonClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data, error } = await anonClient.rpc("bootstrap_neuroeduca_super_admin", {
      p_email: email,
      p_full_name: fullName,
      p_password: password
    });
    if (error) {
      return res.status(400).json({ authenticated: false, error: error.message });
    }
    const resultObj = data || {};
    if (resultObj.authenticated && resultObj.sessionToken) {
      setSessionCookie(req, res, { sessionToken: resultObj.sessionToken });
    }
    return res.json(resultObj);
  } catch (err) {
    return res.status(500).json({
      authenticated: false,
      error: err?.message || "Erro ao criar Super Administrador inicial."
    });
  }
});
app.post("/api/supabase/config", (req, res) => {
  try {
    const rawUrl = String(req.body?.url || "").trim();
    const rawKey = String(req.body?.anonKey || "").trim();
    const autoSync = req.body?.autoSync !== false;
    if (!rawUrl || !rawKey) {
      return res.status(400).json({
        success: false,
        message: "Forne\xE7a o URL do projecto Supabase e a Chave P\xFAblica (anon/publishable)."
      });
    }
    const saved = persistServerSupabaseConfig(rawUrl, rawKey, autoSync);
    if (!saved) {
      return res.status(400).json({
        success: false,
        message: "Credenciais Supabase inv\xE1lidas."
      });
    }
    const parsed = new URL(saved.url);
    return res.json({
      success: true,
      serverConfigured: true,
      urlHost: parsed.hostname,
      normalizedUrl: saved.url
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err?.message || "URL do Supabase inv\xE1lido."
    });
  }
});
app.post("/api/supabase/test", async (req, res) => {
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        message: "Forne\xE7a o URL e a Chave P\xFAblica do Supabase ou configure-os em Settings > Secrets."
      });
    }
    const health = await checkSupabaseTablesHealth(
      creds.url,
      creds.serviceRoleKey || creds.anonKey,
      creds.serviceRoleKey ? void 0 : {
        accessToken: extractBearerToken(req),
        sessionToken: extractSessionToken(req)
      }
    );
    if (health.success && req.body?.url && req.body?.anonKey) {
      persistServerSupabaseConfig(creds.url, creds.anonKey, true);
    }
    return res.json(health);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err?.message || "Erro ao validar liga\xE7\xE3o ao Supabase."
    });
  }
});
app.post("/api/supabase/mutate", async (req, res) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      errors: ["Origem de pedido n\xE3o autorizada."],
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        errors: ["Supabase n\xE3o configurado."],
        syncedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const sessionToken = extractSessionToken(req);
    const accessToken = extractBearerToken(req);
    if (!sessionToken && !accessToken) {
      return res.status(401).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        errors: ["Sess\xE3o autenticada obrigat\xF3ria para gravar no Supabase."],
        syncedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const batch = req.body || {};
    const client = createServerSupabaseClient(creds, req);
    const result = await syncChangesToSupabase(client, batch);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      errors: [err?.message || "Erro ao sincronizar altera\xE7\xF5es com o Supabase."],
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.post("/api/supabase/push", async (req, res) => {
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: ["Supabase n\xE3o configurado. Configure o URL e a Chave P\xFAblica primeiro."],
        syncedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (req.body?.url && req.body?.anonKey) {
      persistServerSupabaseConfig(creds.url, creds.anonKey, true);
    }
    const bundle = req.body?.bundle;
    if (!bundle || typeof bundle !== "object") {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: ["Bundle de dados em falta para envio ao Supabase."],
        syncedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const client = createServerSupabaseClient(creds, req);
    const result = await pushBundleToSupabase(client, bundle, {
      pruneMissing: Boolean(req.body?.pruneMissing)
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      tableCounts: {},
      missingTables: [],
      errors: [err?.message || "Erro ao enviar dados para o Supabase."],
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.post("/api/supabase/pull", async (req, res) => {
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        bundle: null,
        pulledCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: ["Supabase n\xE3o configurado. Configure o URL e a Chave P\xFAblica primeiro."],
        pulledAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const client = createServerSupabaseClient(creds, req);
    const result = await pullBundleFromSupabase(client);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      bundle: null,
      pulledCount: 0,
      tableCounts: {},
      missingTables: [],
      errors: [err?.message || "Erro ao importar dados do Supabase."],
      pulledAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.post("/api/supabase/announcement-read", async (req, res) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ success: false });
  }
  try {
    const announcementId = String(req.body?.announcementId || "").trim();
    const readKey = String(req.body?.readKey || "").trim();
    if (!announcementId || !readKey) {
      return res.status(400).json({ success: false });
    }
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({ success: false });
    }
    const client = createServerSupabaseClient(creds, req);
    const { data, error } = await client.rpc("mark_neuroeduca_announcement_read", {
      p_announcement_id: announcementId,
      p_read_key: readKey
    });
    return res.json({ success: !error && Boolean(data) });
  } catch {
    return res.status(500).json({ success: false });
  }
});
app.post("/api/supabase/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();
    if (!email || !password) {
      return res.status(400).json({ authenticated: false, message: "E-mail e palavra-passe obrigat\xF3rios." });
    }
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ authenticated: false, cloudUnavailable: true });
    }
    const anonClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data: rpcData, error: rpcErr } = await anonClient.rpc("verify_neuroeduca_login", {
      p_email: email,
      p_password: password
    });
    if (!rpcErr && rpcData) {
      const resultObj = rpcData;
      if (resultObj.inactive) {
        return res.json({ authenticated: false, inactive: true });
      }
      if (resultObj.authenticated && resultObj.account) {
        let accessToken;
        try {
          const { data: authSessionData } = await anonClient.auth.signInWithPassword({ email, password });
          accessToken = authSessionData?.session?.access_token;
        } catch {
        }
        setSessionCookie(req, res, {
          sessionToken: resultObj.sessionToken,
          accessToken
        });
        return res.json({
          authenticated: true,
          account: resultObj.account,
          ...resultObj.sessionToken ? { sessionToken: resultObj.sessionToken } : {},
          ...accessToken ? { accessToken } : {}
        });
      }
    }
    const authClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email,
      password
    });
    if (!authErr && authData?.user) {
      const accessToken = authData.session?.access_token;
      const accountReader = creds.serviceRoleKey ? createValidatedSupabaseClient(creds.url, creds.serviceRoleKey) : createValidatedSupabaseClient(creds.url, creds.anonKey, { accessToken });
      const { data: accountRow } = await accountReader.from("neuroeduca_accounts").select("email, full_name, role, institution_id, municipality, province, status, payload").eq("id", email).maybeSingle();
      const payload = accountRow?.payload || {};
      const status = String(accountRow?.status || payload.status || "activo");
      if (status === "inactivo") {
        return res.json({ authenticated: false, inactive: true });
      }
      if (accessToken) {
        setSessionCookie(req, res, { accessToken });
      }
      const meta = authData.user.user_metadata || {};
      return res.json({
        authenticated: true,
        ...accessToken ? { accessToken } : {},
        account: {
          email: accountRow?.email || authData.user.email || email,
          fullName: accountRow?.full_name || payload.fullName || meta.full_name || meta.fullName || email,
          role: accountRow?.role || payload.role || meta.role || "director_geral",
          institutionId: accountRow?.institution_id || payload.institutionId || meta.institution_id || void 0,
          institutionName: payload.institutionName || void 0,
          municipality: accountRow?.municipality || payload.municipality || meta.municipality || void 0,
          province: accountRow?.province || payload.province || meta.province || void 0,
          status: "activo"
        }
      });
    }
    if (creds.serviceRoleKey) {
      const reader = createValidatedSupabaseClient(creds.url, creds.serviceRoleKey);
      const { data } = await reader.from("neuroeduca_accounts").select("email, full_name, role, institution_id, municipality, province, status, payload").eq("id", email).maybeSingle();
      if (data) {
        const payload = data.payload || {};
        const storedPassword = String(payload.password || "").trim();
        const status = String(data.status || payload.status || "activo");
        if (status === "inactivo") {
          return res.json({ authenticated: false, inactive: true });
        }
        if (storedPassword && storedPassword === password) {
          return res.json({
            authenticated: true,
            account: {
              email: data.email || email,
              fullName: data.full_name || payload.fullName || email,
              role: data.role || payload.role || "director_geral",
              institutionId: data.institution_id || payload.institutionId || void 0,
              institutionName: payload.institutionName || void 0,
              municipality: data.municipality || payload.municipality || void 0,
              province: data.province || payload.province || void 0,
              status: "activo"
            }
          });
        }
      }
    }
    return res.json({ authenticated: false });
  } catch {
    return res.json({ authenticated: false });
  }
});
app.post("/api/supabase/storage/upload", async (req, res) => {
  try {
    const { document, fileDataBase64 } = req.body || {};
    if (!document?.id || !fileDataBase64) {
      return res.status(400).json({ success: false, error: "Documento ou ficheiro em falta." });
    }
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ success: false, cloudUnavailable: true, error: "Supabase n\xE3o configurado." });
    }
    const client = createServerSupabaseClient(creds, req);
    const result = await uploadArchiveDocumentToStorage(client, document, fileDataBase64);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Erro ao enviar ficheiro para o Supabase Storage."
    });
  }
});
app.post("/api/supabase/storage/signed-url", async (req, res) => {
  try {
    const { storagePath, storageBucket, downloadFileName } = req.body || {};
    if (!storagePath) {
      return res.status(400).json({ success: false, error: "Caminho do ficheiro em falta." });
    }
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ success: false, cloudUnavailable: true });
    }
    const client = createServerSupabaseClient(creds, req);
    const result = await getSignedArchiveUrlFromStorage(
      client,
      storagePath,
      storageBucket,
      3600,
      downloadFileName
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Erro ao gerar URL assinado para o documento."
    });
  }
});
app.post("/api/supabase/storage/delete", async (req, res) => {
  try {
    const { storagePath, storageBucket } = req.body || {};
    if (!storagePath) {
      return res.json({ success: true });
    }
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ success: false, cloudUnavailable: true });
    }
    const client = createServerSupabaseClient(creds, req);
    const result = await deleteArchiveDocumentFromStorage(client, storagePath, storageBucket);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Erro ao eliminar ficheiro do Supabase Storage."
    });
  }
});
app.post("/api/archive/upload", (req, res) => {
  try {
    const { document, fileDataBase64 } = req.body || {};
    if (!document || !document.id || !fileDataBase64) {
      return res.status(400).json({ error: "Dados do documento ou ficheiro em falta." });
    }
    ensureArchiveDir();
    const safeId = getSafeArchiveId(document.id);
    const base64Clean = String(fileDataBase64).replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");
    const ext = getExtensionFromMimeOrName(document.mimeType, document.fileName);
    const filePath = path.join(ARCHIVE_DIR, `${safeId}${ext}`);
    fs.writeFileSync(filePath, buffer);
    const savedDoc = {
      ...document,
      fileUrl: `/api/archive/file/${safeId}`,
      fileSizeBytes: buffer.length,
      dataUrl: void 0
    };
    return res.json({ success: true, document: savedDoc });
  } catch (err) {
    console.error("Erro ao guardar ficheiro no Arquivo Digital:", err);
    return res.status(500).json({ error: err?.message || "Erro ao guardar ficheiro." });
  }
});
app.get("/api/archive/file/:id", (req, res) => {
  try {
    const safeId = getSafeArchiveId(req.params.id);
    if (fs.existsSync(ARCHIVE_DIR)) {
      const files = fs.readdirSync(ARCHIVE_DIR);
      const match = files.find((f) => f === safeId || f.startsWith(`${safeId}.`));
      if (match) {
        const fullPath = path.join(ARCHIVE_DIR, match);
        const ext = path.extname(match).toLowerCase();
        const fallbackMime = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
        const disposition2 = req.query.download === "1" ? "attachment" : "inline";
        const downloadName = match.replace(/"/g, "");
        res.setHeader("Content-Type", fallbackMime);
        res.setHeader("Content-Disposition", `${disposition2}; filename="${downloadName}"`);
        return res.sendFile(fullPath);
      }
    }
    const fileName = escapeXml(`${safeId}.svg`);
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="580" viewBox="0 0 840 580">
  <rect width="840" height="580" fill="#ffffff"/>
  <rect x="24" y="24" width="792" height="532" rx="12" fill="#f8fafc" stroke="#0073b7" stroke-width="3"/>
  <rect x="24" y="24" width="792" height="84" rx="12" fill="#0073b7"/>
  <text x="420" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">REP\xDABLICA DE ANGOLA \xB7 ARQUIVO DIGITAL ESCOLAR</text>
  <text x="420" y="88" font-family="Arial, sans-serif" font-size="14" fill="#e0f2fe" text-anchor="middle">Documento Escolar Digitalizado</text>
  <rect x="64" y="160" width="712" height="290" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="420" y="290" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0073b7" text-anchor="middle">DOCUMENTO DIGITALIZADO ARQUIVADO</text>
  <text x="420" y="325" font-family="Arial, sans-serif" font-size="13" fill="#475569" text-anchor="middle">Refer\xEAncia: ${fileName}</text>
  <text x="420" y="360" font-family="Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Dispon\xEDvel para consulta no Supabase Storage</text>
  <text x="64" y="520" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Registo NEUROEDUCA Angola \xB7 Arquivo Digital Seguro</text>
</svg>`;
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeId}.svg"`);
    return res.send(sampleSvg);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erro ao abrir documento." });
  }
});
app.delete("/api/archive/file/:id", (req, res) => {
  try {
    const safeId = getSafeArchiveId(req.params.id);
    if (fs.existsSync(ARCHIVE_DIR)) {
      const files = fs.readdirSync(ARCHIVE_DIR);
      files.filter((f) => f === safeId || f.startsWith(`${safeId}.`)).forEach((f) => {
        try {
          fs.unlinkSync(path.join(ARCHIVE_DIR, f));
        } catch {
        }
      });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erro ao eliminar ficheiro." });
  }
});
app.post("/api/gemini/pedagogical-assistant", async (req, res) => {
  const {
    subsystemCode,
    gradeLevel,
    subjectName,
    topic,
    subtopic,
    lessonDurationMinutes = 45,
    assistantTask = "plano_aula"
  } = req.body;
  const client = await getGeminiClient();
  if (!apiKey || !client) {
    return res.status(503).json({
      error: "API Gemini n\xE3o configurada no servidor. Verifique a chave em Settings > Secrets."
    });
  }
  try {
    let taskInstruction = "";
    if (assistantTask === "plano_aula") {
      taskInstruction = `
Elabora um PLANO DE AULA OFICIAL completo no modelo do Minist\xE9rio da Educa\xE7\xE3o de Angola (MED) e INIDE:
1. Cabe\xE7alho Oficial (Rep\xFAblica de Angola, Minist\xE9rio da Educa\xE7\xE3o, Subsistema: ${subsystemCode}, Classe: ${gradeLevel}, Disciplina: ${subjectName}, Tema: ${topic}, Dura\xE7\xE3o: ${lessonDurationMinutes} min).
2. Objectivos da Aula:
   - Objectivo Instrutivo / Cognitivo (o que os alunos ir\xE3o aprender e assimilar).
   - Objectivo Educativo / Formativo (valores morais, cidadania e atitudes).
3. Meios e Recursos Did\xE1cticos (quadro, giz/marcador, manual escolar do aluno aprovado pelo INIDE, cartazes, etc.).
4. M\xE9todos de Ensino (Expositivo, Elabora\xE7\xE3o Conjunta, Trabalho Independente, Pr\xE1tico).
5. Fases Did\xE1cticas da Aula (tabela/sec\xE7\xF5es detalhadas com tempo, actividade do professor e actividade do aluno):
   - I. Introdu\xE7\xE3o e Motiva\xE7\xE3o (revis\xE3o da aula anterior, motiva\xE7\xE3o, apresenta\xE7\xE3o do tema).
   - II. Media\xE7\xE3o e Assimila\xE7\xE3o da Nova Mat\xE9ria (explica\xE7\xE3o detalhada do conte\xFAdo com exemplos do quotidiano angolano).
   - III. Dom\xEDnio e Consolida\xE7\xE3o (exerc\xEDcios pr\xE1ticos no caderno e no quadro).
   - IV. Controlo e Avalia\xE7\xE3o (verifica\xE7\xE3o formativa da aprendizagem).
6. Tarefa para Casa / Trabalho Individual.
7. Observa\xE7\xE3o Pedag\xF3gica (alinhada aos crit\xE9rios oficiais do INIDE).
`;
    } else if (assistantTask === "exercicios") {
      taskInstruction = `
Elabora uma FICHA DE ACTIVIDADES E EXERC\xCDCIOS PEDAG\xD3GICOS completa para a disciplina de ${subjectName}, ${gradeLevel}, sobre o tema "${topic}" ${subtopic ? `e subtema "${subtopic}"` : ""}:
- Inclui 5 a 8 quest\xF5es pedag\xF3gicas progressivas (do n\xEDvel de reprodu\xE7\xE3o ao de aplica\xE7\xE3o pr\xE1tica).
- Contextualiza os enunciados \xE0 realidade social, geogr\xE1fica e cultural de Angola.
- Fornece no final a CHAVE DE RESOLU\xC7\xC3O / CORREC\xC7\xC3O detalhada para o professor.
`;
    } else if (assistantTask === "avaliacao") {
      taskInstruction = `
Elabora uma PROVA DE AVALIA\xC7\xC3O TRIMESTRAL (NPT / Prova do Professor) oficial:
- Disciplina: ${subjectName}, Classe: ${gradeLevel}, Subsistema: ${subsystemCode}.
- Tema / Conte\xFAdos avaliados: ${topic}.
- Cota\xE7\xE3o total de 20 valores (especificar a pontua\xE7\xE3o de cada quest\xE3o).
- Matriz de Avalia\xE7\xE3o com compet\xEAncias avaliadas.
- Chave de correc\xE7\xE3o e crit\xE9rios de classifica\xE7\xE3o rigorosos.
`;
    } else {
      taskInstruction = `
Elabora um PLANO DE RECUPERA\xC7\xC3O PEDAG\xD3GICA para estudantes com dificuldades de aproveitamento em ${subjectName} (${gradeLevel}):
- Diagn\xF3stico das dificuldades comuns no tema "${topic}".
- Estrat\xE9gias diferenciadas de interven\xE7\xE3o em sala de aula e refor\xE7o.
- 4 exerc\xEDcios de recupera\xE7\xE3o com tutoria e apoio dos encarregados de educa\xE7\xE3o.
`;
    }
    const systemInstruction = `\xC9s o Assistente Pedag\xF3gico Inteligente do NEUROEDUCA, especialista oficial no Sistema de Educa\xE7\xE3o e Ensino da Rep\xFAblica de Angola (MED, INIDE, INETP, MESCTI).
Utilizas sempre a terminologia pedag\xF3gica angolana (Classes, Trimestres, Pautas, Mini-pautas, MAC, NPP, NPT, Encarregados de Educa\xE7\xE3o, etc.).
Quando sugerires planos de aula ou actividades, respeitas rigorosamente as matrizes curriculares do INIDE.
Apresenta o conte\xFAdo formatado com clareza em Markdown profissional, com sec\xE7\xF5es organizadas, tabelas e avisos pr\xE1ticos.`;
    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: taskInstruction,
      config: {
        systemInstruction
      }
    });
    const resultText = response.text || "N\xE3o foi poss\xEDvel gerar a resposta.";
    res.json({
      success: true,
      resultText,
      subsystemCode,
      gradeLevel,
      subjectName,
      topic,
      assistantTask
    });
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    res.status(500).json({
      error: error.message || "Erro ao processar pedido com IA pedag\xF3gica."
    });
  }
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(SERVER_ROOT_DIR, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} NEUROEDUCA rodando em http://localhost:${PORT}`);
    console.log(`\u{1F1E6}\u{1F1F4} Sistema de Gest\xE3o Escolar de Angola configurado (100% Supabase)`);
  });
}
if (!IS_VERCEL) {
  startServer();
}
var server_default = app;

// scripts/vercel-api-entry.ts
function handler(req, res) {
  try {
    const rawUrl = String(req?.url || "/");
    const urlObj = new URL(rawUrl, "http://localhost");
    const rewrittenPath = urlObj.searchParams.get("__ne_path");
    if (rewrittenPath !== null) {
      urlObj.searchParams.delete("__ne_path");
      const cleanSubpath = rewrittenPath.replace(/^\/+/, "");
      const qs = urlObj.searchParams.toString();
      req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ""}`;
    } else if (urlObj.pathname === "/api" || urlObj.pathname === "/api/index") {
      const originalHeader = String(
        req?.headers?.["x-vercel-original-url"] || req?.headers?.["x-forwarded-uri"] || req?.headers?.["x-rewrite-url"] || ""
      ).trim();
      if (originalHeader.startsWith("/api/")) {
        req.url = originalHeader;
      }
    }
  } catch {
  }
  const expressApp = typeof server_default === "function" ? server_default : server_default?.default || server_default?.app;
  return expressApp(req, res);
}
export {
  handler as default
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Núcleo Partilhado de Validação e Sincronização Supabase
 * Utilizado tanto no servidor Express quanto no adaptador cliente.
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Servidor Full-Stack Express, Autenticação via Cookie Seguro & API Gemini
 */
