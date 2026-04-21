// app.js — Mural de Avisos

// Lógica de autenticação e acesso ao Firebase Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── 1. CONFIGURAÇÃO ───────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyC_YmpOLpfy9YwbDtVCeBdKAOnSunz0N5s",
  authDomain: "atividade-modelagem-ad3c7.firebaseapp.com",
  databaseURL: "https://atividade-modelagem-ad3c7-default-rtdb.firebaseio.com",
  projectId: "atividade-modelagem-ad3c7",
  storageBucket: "atividade-modelagem-ad3c7.firebasestorage.app",
  messagingSenderId: "111405310836",
  appId: "1:111405310836:web:9c2e2c09e8f87dfbd9c221",
  measurementId: "G-TBLBFCD206"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


let currentUser = null; // guarda { uid, name, email, role, ... }

// ─── 2. AUTENTICAÇÃO ───────────────────────────────────────────────────────

// Login
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    showError("login-err", traduzirErro(err.code));
  }
});

// Cadastro
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const turma = document.getElementById("reg-turma").value;
  const role = document.getElementById("reg-role").value;
  try {
    // Cria o usuário no Firebase Auth
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Salva o perfil + cargo no banco: /users/{uid}
    // OBS : o cargo é definido aqui na criação. A Security Rule impede alteração posterior.
    await set(ref(db, `users/${user.uid}`), {
      name, email, role, turma,
      telefone: "",
      createdAt: new Date().toISOString().split("T")[0]
    });

  } catch (err) {
    showError("register-err", traduzirErro(err.code));
  }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

// Observer: dispara toda vez que o estado de login muda
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Busca o cargo no banco (não no Auth)
    const snap = await get(ref(db, `users/${firebaseUser.uid}`));
    const data = snap.val() || { name: firebaseUser.email, role: "user" };

    currentUser = { uid: firebaseUser.uid, ...data };

    showScreen("dashboard");
    atualizarTopbar();
    renderSidebar();
    carregarView("mural");
  } else {
    currentUser = null;
    showScreen("auth");
  }
});

// ─── 3. SIDEBAR ────────────────────────────────────────────────────────────

function renderSidebar() {
  const isAdmin = currentUser.role === "admin";
  const sidebar = document.getElementById("sidebar");

  sidebar.innerHTML = `
    <div class="nav-section">Menu</div>
    <button class="nav-btn" data-view="mural">📋 Mural de Avisos</button>
    <button class="nav-btn" data-view="perfil">👤 Meu Perfil</button>
    ${isAdmin ? `
    <div class="nav-section">Admin</div>
    <button class="nav-btn admin-btn" data-view="publicar">✏️ Publicar Aviso</button>
    <button class="nav-btn admin-btn" data-view="diretoria">🏛️ Diretoria</button>
    <button class="nav-btn admin-btn" data-view="bloqueados">🚫 Bloqueados</button>
    ` : ""}
  `;

  sidebar.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => carregarView(btn.dataset.view));
  });
}

// ─── 4. VIEWS ──────────────────────────────────────────────────────────────

function carregarView(viewId) {
  // Marca o botão ativo
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const activeBtn = document.querySelector(`[data-view="${viewId}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const content = document.getElementById("content");

  if (viewId !== "mural" && currentUser.role !== "admin" && ["publicar", "diretoria", "bloqueados"].includes(viewId)) {
    // Firebase bloquearia aqui; mostramos a tela de acesso negado
    content.innerHTML = renderDenied(`/admin-data`);
    return;
  }

  switch (viewId) {
    case "mural": renderMural(content); break;
    case "perfil": renderPerfil(content); break;
    case "publicar": renderPublicar(content); break;
    case "diretoria": renderDiretoria(content); break;
    case "bloqueados": renderBloqueados(content); break;
  }
}

// ── Mural: lê /posts (qualquer usuário logado pode ler) ──────────────────
function renderMural(el) {
  el.innerHTML = `<h2>📋 Mural de Avisos</h2><p class="sub">Carregando...</p>`;

  // onValue: ouve em tempo real — qualquer novo aviso aparece automaticamente
  onValue(ref(db, "posts"), (snap) => {
    const posts = snap.val() || {};
    const lista = Object.entries(posts).reverse();

    const isAdmin = currentUser.role === "admin";
    const catClass = { aviso: "", urgente: " urgente", evento: " evento" };
    const catLabel = { aviso: "Aviso", urgente: "Urgente", evento: "Evento" };

    el.innerHTML = `
      <div class="view-header">
        <div>
          <h2>📋 Mural de Avisos</h2>
          <p class="sub">${lista.length} aviso(s) publicado(s)</p>
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="carregarView('publicar')">+ Novo aviso</button>` : ""}
      </div>
      ${lista.map(([id, p]) => `
        <div class="post-card${catClass[p.categoria] || ""}">
          <div class="post-meta">
            <span class="post-cat cat-${p.categoria}">${catLabel[p.categoria] || "Aviso"}</span>
            <span class="post-date">${p.data}</span>
            <span class="post-author">por ${p.autor}</span>
          </div>
          <h3 class="post-title">${p.titulo}</h3>
          <p class="post-body">${p.corpo}</p>
          ${isAdmin ? `
            <div class="post-actions">
              <button class="btn btn-sm btn-ghost" onclick="editarPost('${id}')">✏️ Editar</button>
              <button class="btn btn-sm btn-danger" onclick="deletarPost('${id}')">🗑️ Deletar</button>
            </div>
          ` : `<p class="post-lock">🔒 Somente leitura — alunos não podem editar</p>`}
        </div>
      `).join("") || `<p class="sub" style="text-align:center;padding:40px">Nenhum aviso publicado ainda.</p>`}
    `;
  }, { onlyOnce: true }); // troque por false para tempo real contínuo
}

// ── Perfil: lê e edita /users/{uid} (próprio usuário) ────────────────────
async function renderPerfil(el) {
  el.innerHTML = `<h2>👤 Meu Perfil</h2><p class="sub">Carregando...</p>`;
  const snap = await get(ref(db, `users/${currentUser.uid}`));
  const u = snap.val() || {};

  el.innerHTML = `
    <h2>👤 Meu Perfil</h2>
    <p class="sub">Atualize seus dados de contato — /users/${currentUser.uid}</p>
    <div class="card">
      <label>Nome completo</label>
      <input id="p-name" value="${u.name || ""}" />
      <label>Telefone</label>
      <input id="p-tel" value="${u.telefone || ""}" />
      <label>Turma</label>
      <input id="p-turma" value="${u.turma || ""}" />
      <p class="field-note">Cargo: <strong>${u.role}</strong> — não pode ser alterado aqui (protegido pela Security Rule)</p>
      <button class="btn btn-primary" onclick="salvarPerfil()">Salvar</button>
      <div id="perfil-ok" class="msg-ok hidden">✅ Salvo com sucesso!</div>
    </div>
  `;
}

async function salvarPerfil() {
  // update() altera apenas os campos enviados, sem sobrescrever "role"
  await update(ref(db, `users/${currentUser.uid}`), {
    name: document.getElementById("p-name").value,
    telefone: document.getElementById("p-tel").value,
    turma: document.getElementById("p-turma").value,
  });
  const ok = document.getElementById("perfil-ok");
  ok.classList.remove("hidden");
  setTimeout(() => ok.classList.add("hidden"), 2500);
}

// ── Publicar aviso: escreve em /posts — só admin (Security Rule garante) ──
let editingPostId = null;

function renderPublicar(el, postId = null) {
  editingPostId = postId;
  let p = {};
  if (postId) {
    get(ref(db, `posts/${postId}`)).then(snap => {
      p = snap.val() || {};
      preencherFormPublicar(el, p, postId);
    });
    return;
  }
  preencherFormPublicar(el, {}, null);
}

function preencherFormPublicar(el, p, postId) {
  el.innerHTML = `
    <h2>✏️ ${postId ? "Editar" : "Publicar"} Aviso</h2>
    <p class="sub">Escrita em /posts — exclusivo para diretoria</p>
    <div class="card">
      <label>Título</label>
      <input id="post-titulo" value="${p.titulo || ""}" />
      <label>Categoria</label>
      <select id="post-cat">
        <option value="aviso"   ${p.categoria === "aviso" ? "selected" : ""}>Aviso geral</option>
        <option value="urgente" ${p.categoria === "urgente" ? "selected" : ""}>Urgente</option>
        <option value="evento"  ${p.categoria === "evento" ? "selected" : ""}>Evento</option>
      </select>
      <label>Conteúdo</label>
      <textarea id="post-corpo" rows="5">${p.corpo || ""}</textarea>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-primary" onclick="salvarPost('${postId || ""}')">
          ${postId ? "Salvar edição" : "Publicar no mural"}
        </button>
        <button class="btn btn-ghost" onclick="carregarView('mural')">Cancelar</button>
      </div>
    </div>
  `;
}

async function salvarPost(postId) {
  const dados = {
    titulo: document.getElementById("post-titulo").value,
    corpo: document.getElementById("post-corpo").value,
    categoria: document.getElementById("post-cat").value,
    autor: currentUser.name,
    autorId: currentUser.uid,
    data: new Date().toISOString().split("T")[0],
  };
  if (!dados.titulo || !dados.corpo) return;

  if (postId) {
    // Edição: update() mantém os dados existentes
    await update(ref(db, `posts/${postId}`), dados);
  } else {
    // Novo: push() gera um ID único automático
    await push(ref(db, "posts"), dados);
  }
  carregarView("mural");
}

// Exposição global para os onclick inline do HTML gerado
window.editarPost = (id) => renderPublicar(document.getElementById("content"), id);
window.deletarPost = async (id) => {
  if (confirm("Deletar este aviso?")) {
    await remove(ref(db, `posts/${id}`));
    carregarView("mural");
  }
};
window.salvarPost = salvarPost;
window.salvarPerfil = salvarPerfil;
window.carregarView = carregarView;

// ── Diretoria: lê /admin-data/diretoria ──────────────────────────────────
async function renderDiretoria(el) {
  const snap = await get(ref(db, "admin-data"));
  const data = snap.val() || {};
  const diretoria = data.diretoria || {};
  const config = data.config || {};

  el.innerHTML = `
    <h2>🏛️ Diretoria</h2>
    <p class="sub">/admin-data — quem pode publicar no mural</p>
    <div class="card">
      <h3>Configuração do curso</h3>
      <label>Nome do curso</label>
      <input id="cfg-curso" value="${config.curso || ""}" />
      <label>Instituição</label>
      <input id="cfg-inst" value="${config.instituicao || ""}" />
      <button class="btn btn-primary" onclick="salvarConfig()">Salvar configuração</button>
    </div>
    <div class="card">
      <h3>Membros com permissão de publicar</h3>
      ${Object.entries(diretoria).map(([uid, m]) => `
        <div class="member-row">
          <div>
            <strong>${m.nome}</strong><br>
            <small>${m.cargo} · desde ${m.desde}</small>
          </div>
          <span class="badge badge-admin">admin</span>
        </div>
      `).join("") || "<p class='sub'>Nenhum membro cadastrado.</p>"}
    </div>
  `;
}

window.salvarConfig = async () => {
  await update(ref(db, "admin-data/config"), {
    curso: document.getElementById("cfg-curso").value,
    instituicao: document.getElementById("cfg-inst").value,
  });
  alert("Configuração salva!");
};

// ── Bloqueados: lê e escreve /admin-data/bloqueados ──────────────────────
async function renderBloqueados(el) {
  const snap = await get(ref(db, "admin-data/bloqueados"));
  const bloqueados = snap.val() || {};

  el.innerHTML = `
    <h2>🚫 Usuários Bloqueados</h2>
    <p class="sub">/admin-data/bloqueados</p>
    <div class="card">
      <h3>Bloquear usuário</h3>
      <label>UID ou e-mail</label>
      <input id="blk-uid" placeholder="uid do usuário" />
      <label>Motivo</label>
      <input id="blk-motivo" placeholder="Motivo do bloqueio" />
      <button class="btn btn-danger" onclick="bloquear()">Bloquear</button>
    </div>
    <div class="card">
      <h3>${Object.keys(bloqueados).length === 0 ? "Nenhum usuário bloqueado" : "Bloqueados"}</h3>
      ${Object.entries(bloqueados).map(([uid, b]) => `
        <div class="blocked-row">
          <span><strong>${uid}</strong> — ${b.motivo}</span>
          <button class="btn btn-sm btn-ghost" onclick="desbloquear('${uid}')">Remover</button>
        </div>
      `).join("") || ""}
    </div>
  `;
}

window.bloquear = async () => {
  const uid = document.getElementById("blk-uid").value;
  const motivo = document.getElementById("blk-motivo").value;
  if (!uid) return;
  await set(ref(db, `admin-data/bloqueados/${uid}`), {
    motivo: motivo || "Sem motivo informado",
    data: new Date().toISOString().split("T")[0],
  });
  renderBloqueados(document.getElementById("content"));
};

window.desbloquear = async (uid) => {
  await remove(ref(db, `admin-data/bloqueados/${uid}`));
  renderBloqueados(document.getElementById("content"));
};

// ─── 5. HELPERS ────────────────────────────────────────────────────────────

function renderDenied(path) {
  return `
    <div class="denied">
      <div class="denied-icon">🚫</div>
      <h3>Acesso negado</h3>
      <p>Firebase retornou: <code>PERMISSION_DENIED</code></p>
      <p>O nó <code>${path}</code> exige cargo <strong>admin</strong></p>
    </div>`;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(`${name}-screen`).classList.add("active");
}

function atualizarTopbar() {
  document.getElementById("topbar-name").textContent = currentUser.name;
  const badge = document.getElementById("topbar-badge");
  badge.textContent = currentUser.role;
  badge.className = `badge badge-${currentUser.role}`;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function traduzirErro(code) {
  const erros = {
    "auth/user-not-found": "Usuário não encontrado",
    "auth/wrong-password": "Senha incorreta",
    "auth/email-already-in-use": "E-mail já cadastrado",
    "auth/weak-password": "Senha fraca (mínimo 6 caracteres)",
    "auth/invalid-email": "E-mail inválido",
  };
  return erros[code] || `Erro: ${code}`;
}

// Troca entre abas Login / Criar conta
document.getElementById("tab-login").addEventListener("click", () => {
  document.getElementById("tab-login").classList.add("active");
  document.getElementById("tab-register").classList.remove("active");
  document.getElementById("login-form").classList.add("active");
  document.getElementById("register-form").classList.remove("active");
});
document.getElementById("tab-register").addEventListener("click", () => {
  document.getElementById("tab-register").classList.add("active");
  document.getElementById("tab-login").classList.remove("active");
  document.getElementById("register-form").classList.add("active");
  document.getElementById("login-form").classList.remove("active");
});
