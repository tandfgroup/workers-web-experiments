import { createEffect, createSignal, For, Show } from "solid-js";
import { FormError, useRouteData } from "solid-start";
import { createServerAction$, createServerData$ } from "solid-start/server";
import {
  getTodos,
  addTodo,
  editTodo,
  deleteTodo,
  validateTodoText,
  getOrCreateSessionId,
  getSessionIdFromRequest,
  saveSessionIdCookie,
} from "shared";

export function routeData() {
  return createServerData$(async (_, { request, env }) => {
    const db = getTodosDb(env);
    const sessionId = await getOrCreateSessionId(request, db);
    const todos = await getTodos(db, sessionId);
    return {
      sessionId,
      todos,
    };
  });
}

export default function Home() {
  const data = useRouteData<typeof routeData>();

  const [newTodo, setNewTodo] = createSignal("");

  createEffect(() => {
    const { sessionId } = data.latest ?? {};
    if (sessionId) {
      saveSessionIdCookie(sessionId);
    }
  });

  const [addTodoServerAction, { Form: AddTodoForm }] = createServerAction$(
    async (formData: FormData, { request, env }) => {
      const db = getTodosDb(env);
      const text = formData.get("text") as string;
      const todoTextValidation = validateTodoText(text);
      if (!todoTextValidation.valid) {
        throw new FormError(todoTextValidation.reason);
      }
      const sessionId = getSessionId(request);
      try {
        await addTodo(db, sessionId, text);
      } catch {
        throw new FormError("DataBase Internal Error");
      }
    },
    {
      invalidate: () => setNewTodo(""),
    }
  );

  const [editTodoServerAction, { Form: EditTodoForm }] = createServerAction$(
    async (formData: FormData, { request, env }) => {
      const db = getTodosDb(env);
      const id = formData.get("todo-id") as string;
      const completed = formData.get("completed") as string;
      const sessionId = getSessionId(request);
      try {
        await editTodo(db, sessionId, id, completed === "true");
      } catch {
        throw new FormError("DataBase Internal Error");
      }
    }
  );

  const [deleteTodoServerAction, { Form: DeleteTodoForm }] =
    createServerAction$(async (formData: FormData, { request, env }) => {
      const db = getTodosDb(env);
      const id = formData.get("todo-id") as string;
      const sessionId = getSessionId(request);
      try {
        await deleteTodo(db, sessionId, id);
      } catch {
        throw new FormError("DataBase Internal Error");
      }
    });

  const backendError = () =>
    addTodoServerAction.error?.message ??
    editTodoServerAction.error?.message ??
    deleteTodoServerAction.error?.message;

  return (
    <main class="todos-app">
      <h1>Todos</h1>
      <AddTodoForm>
        <div class="new-todo-input-form-control">
          <input
            class={
              !newTodo() || validateTodoText(newTodo()).valid ? "" : "invalid"
            }
            type="text"
            name="text"
            value={newTodo()}
            onInput={(event) =>
              setNewTodo((event.target as unknown as { value: string }).value)
            }
          />
          <button disabled={!newTodo()}>add todo</button>
        </div>
      </AddTodoForm>
      <Show when={backendError()}>
        <p class="backend-error">{backendError()}</p>
      </Show>
      <ul>
        <For each={data()?.todos}>
          {(todo) => {
            const id = () => todo.id;
            const text = () => todo.text;
            const completed = () => todo.completed;

            return (
              <li>
                <EditTodoForm>
                  <input hidden name="todo-id" readOnly value={id()} />
                  <input
                    hidden
                    name="completed"
                    readOnly
                    value={`${!completed()}`}
                  />
                  <button
                    role="checkbox"
                    aria-checked={completed()}
                    aria-label={text()}
                    class={`custom-checkbox ${completed() ? "checked" : ""}`}
                  ></button>
                </EditTodoForm>
                <span class={completed() ? "line-through" : ""}>{text()}</span>
                <DeleteTodoForm>
                  <input hidden name="todo-id" readOnly value={id()} />
                  <button class="delete-btn" aria-label="delete"></button>
                </DeleteTodoForm>
              </li>
            );
          }}
        </For>
      </ul>
    </main>
  );
}

function getTodosDb(env: Env) {
  const e = env as {
    __D1_BETA__D1_TODOS_DB?: D1Database;
    D1_TODOS_DB?: D1Database;
  };

  const db = e.__D1_BETA__D1_TODOS_DB ?? e.D1_TODOS_DB;

  if (!db) {
    throw new Error(`No D1_TODOS_DB binding found`);
  }

  return db;
}

function getSessionId(request: Request): string {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    throw new FormError("Session id not provided");
  }
  return sessionId;
}
