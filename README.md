# 🗄️ Estrutura do Banco de Dados

O sistema utiliza o Firebase Realtime Database com três nós principais:

- "/posts"
- "/users"
- "/admin-data"

## Contas criadas

| Nome            | E-mail                    | Senha    | Cargo |
|-----------------|---------------------------|----------|-------|
| Francisco Vital | coordenador@unima.com     | teste123 | admin |
| Marcos Vinicius | professor@unima.com       | teste123 | admin |
| Luiz Arthur     | aluno@unima.com           | teste123 | user  |
| André Santos    | aluno2@unima.com          | teste123 | user  |

> Entre com uma conta **admin** para publicar, editar e deletar avisos e acessar o painel da diretoria.  
> Entre com uma conta **user** para ver que o menu admin não aparece e o acesso ao `/admin-data` é bloqueado.

---

## 📋 "/posts" — Avisos

Armazena os avisos do mural.

### Estrutura

"/posts/{postId}"

### Campos

- "titulo" — título do aviso  
- "corpo" — conteúdo  
- "categoria" — "aviso" | "urgente" | "evento"  
- "autor" — nome de quem publicou  
- "autorId" — UID do autor  
- "data" — data no formato "YYYY-MM-DD"  

### Observações

- Criado com "push()" (ID automático)  
- Editado com "update()"  
- Removido com "remove()"  
- Escrita restrita a usuários com "role = admin"  

---

## 👤 "/users" — Usuários

Armazena os dados dos usuários.

### Estrutura

"/users/{uid}"

### Campos

- "name" — nome  
- "email" — email  
- "role" — "admin" | "user"  
- "turma" — turma ou função  
- "telefone" — contato  
- "createdAt" — data de criação  

### Observações

- Criado no cadastro ("set()")  
- Atualizado com "update()"  
- Cada usuário edita apenas seus próprios dados  
- O campo "role" não deve ser alterado após criação  

---

## 🏛️ "/admin-data" — Dados Administrativos

Contém informações restritas ao sistema.

---

### 📌 "/admin-data/diretoria"

Lista de administradores.

#### Estrutura

"/admin-data/diretoria/{uid}"

#### Campos

- "nome" — nome do membro  
- "cargo" — função  
- "desde" — data de início  

---

### ⚙️ "/admin-data/config"

Configurações do sistema.

#### Campos

- "curso" — nome do curso  
- "instituicao" — nome da instituição  

---

### 🚫 "/admin-data/bloqueados"

Usuários bloqueados.

#### Estrutura

"/admin-data/bloqueados/{uid}"

#### Campos

- "motivo" — motivo do bloqueio  
- "data" — data do bloqueio  

---

## 🔗 Relações

- "posts.autorId" → referencia "/users/{uid}"  
- "/admin-data/diretoria/{uid}" → referencia "/users/{uid}"  
- "/admin-data/bloqueados/{uid}" → referencia "/users/{uid}"  
