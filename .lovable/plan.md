## To Do List Feature — Plan

A new task management system separate from the existing "Assign Task" (service assignments). Admin creates tasks with deadlines & notes; editors act on them and can create their own.

### 1. Database (new migration)

**Table: `todo_tasks`**
- `id` uuid PK
- `company_id` uuid → companies
- `assigned_to` uuid → auth.users (the editor)
- `created_by` uuid → auth.users (admin or editor themselves)
- `creator_role` text ('admin' | 'editor') — determines edit/delete permissions
- `deadline` date
- `admin_note` text
- `editor_note` text
- `status` text ('pending' | 'in_progress' | 'completed') default 'pending'
- `created_at`, `updated_at`

**Table: `todo_task_services`** (many-to-many)
- `id` uuid PK
- `task_id` uuid → todo_tasks (cascade)
- `service_key` text
- unique(task_id, service_key)

**RLS policies:**
- Admin (`has_role(uid,'admin')`) → full CRUD on both tables
- Editor → SELECT tasks where `assigned_to = auth.uid()`
- Editor → UPDATE tasks where `assigned_to = auth.uid()`:
  - if `creator_role='admin'`: only status & editor_note (enforced via trigger checking OLD vs NEW on other fields)
  - if `creator_role='editor' AND created_by=auth.uid()`: all fields
- Editor → INSERT tasks where `created_by=auth.uid() AND assigned_to=auth.uid() AND creator_role='editor'`
- Editor → DELETE tasks where `created_by=auth.uid() AND creator_role='editor'`
- Grants: `authenticated` (SELECT/INSERT/UPDATE/DELETE), `service_role` ALL

### 2. New Components

**`src/components/TodoTaskDialog.tsx`** — Create/edit dialog
- Fields: Company (searchable select), Services (multi-checkbox using existing service defs), Deadline (shadcn DatePicker), Note (textarea)
- For admin: also picks target editor (user select filtered to editors)
- Reused for both admin-create and editor-create with mode prop

**`src/components/TodoTaskCard.tsx`** — Task card
- Header: Company name + status badge (color by status: pending=blue, in_progress=amber, completed=green)
- Assigned By, Assigned To, Services list (chips)
- Deadline with warning color (≤3 days = amber, overdue = red)
- Company progress bar (computed from `company_steps` — % of `done` steps for the selected services)
- Admin Note (read-only for editor), Editor Note (editable for assigned editor)
- Status selector, Save button
- Edit/Delete buttons shown based on permission rules

### 3. New Pages

**`src/pages/TodoList.tsx`** — Admin page (route `/todo-list`, admin only)
- Header with "Create Task" button → TodoTaskDialog
- Filters: search (company/service), status filter, sort by deadline
- Grid of TodoTaskCards (all tasks visible)

**`src/pages/MyTodoList.tsx`** — Editor page (route `/my-todo-list`, editor only)
- Two tabs: "Admin Assigned" | "My Tasks"
- "My Tasks" tab has "Create Task" button
- Same filter/sort controls
- Cards render with appropriate permission mode

### 4. Modifications

**`src/pages/Users.tsx`** — Add "To Do List" button next to "Assign Task" (admin only, for editor rows). Opens TodoTaskDialog pre-filled with that editor as `assigned_to`.

**`src/components/AppLayout.tsx`** — Add two menu items:
- "To Do List" → `/todo-list` (admin only, icon: `ListTodo`)
- "To Do List" → `/my-todo-list` (editor only, icon: `ListTodo`)

**`src/App.tsx`** — Register both new routes with proper `ProtectedRoute` guards.

### 5. Design tokens

Reuse existing semantic tokens from `index.css`. Status colors mapped via existing badge variants; deadline warning uses `text-amber-*` / `text-destructive` classes gated to semantic tokens where available. Progress bar uses shadcn `Progress` component with animated transition.

### Out of scope
- Notifications / email on new task
- Task comments/history log
- Bulk operations

Ready to implement on approval.