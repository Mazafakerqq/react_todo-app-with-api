/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import { dataTodos, USER_ID } from './api/todos';
import { Filter, Todo, TodoInput } from './types/Todo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [todoTitle, setTodoTitle] = useState<string>('');
  const [filter, setFilter] = useState(Filter.All);
  const [loadingAllTodos, setLoadingAllTodos] = useState<boolean>(false);
  const [loadingTodoId, setLoadingTodoId] = useState<number[] | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dataTodos
      .getTodos()
      .then(setTodos)
      .catch(() => {
        setErrorMessage('Unable to load todos');
      });
  }, []);

  function addTodo({ title, completed, userId }: TodoInput): Promise<Todo> {
    setErrorMessage('');
    setLoadingTodoId([-1]);

    const newTodoOverlay = {
      id: -1,
      userId,
      title,
      completed,
    };

    setTodos(currentTodos => [...currentTodos, newTodoOverlay]);

    return dataTodos
      .createTodos({ title, completed, userId })
      .then(newTodo => {
        setTodos([...todos, newTodo]);
        setTodoTitle('');

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
      })
      .catch(error => {
        setTodos(currentTodos => currentTodos.filter(todo => todo.id !== -1));
        setErrorMessage('Unable to add a todo');

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);

        throw error;
      })
      .finally(() => {
        setLoadingTodoId(null);
      });
  }

  function deleteTodo(todoId: number) {
    setLoadingTodoId(prevIds => {
      return prevIds ? [...prevIds, todoId] : [todoId];
    });
    setErrorMessage('');

    return dataTodos
      .deleteTodos(todoId)
      .then(() => {
        setTodos(todos.filter(todo => todo.id !== todoId));

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
      })
      .catch(error => {
        setErrorMessage('Unable to delete a todo');
        throw error;
      })
      .finally(() => {
        setLoadingTodoId(null);
      });
  }

  function updateTodo(updatedTodo: Todo) {
    setErrorMessage('');
    setLoadingTodoId([updatedTodo.id]);

    return dataTodos
      .updateTodos(updatedTodo)
      .then(todo => {
        setTodos(currentTodos => {
          const newTodos = [...currentTodos];
          const index = newTodos.findIndex(t => t.id === todo.id);

          newTodos.splice(index, 1, todo);

          return newTodos;
        });
      })
      .catch(error => {
        setErrorMessage('Unable to update a todo');
        throw error;
      })
      .finally(() => {
        setLoadingTodoId(null);
        setLoadingAllTodos(false);
      });
  }

  function handleChangeTodoCompleted(todoId: number) {
    const todoToUpdate = todos.find(todo => todo.id === todoId);

    if (!todoToUpdate) {
      return;
    }

    const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };

    updateTodo(updatedTodo).catch(() => {
      setErrorMessage('Unable to update a todo');
    });
  }

  function handleChangeAllTodosCompleted() {
    const areAllCompleted = todos.every(todo => todo.completed);
    const todosToUpdate = todos.filter(
      todo => todo.completed === areAllCompleted,
    );
    const updatedTodos = todos.map(todo =>
      todosToUpdate.includes(todo)
        ? { ...todo, completed: !areAllCompleted }
        : todo,
    );

    setTodos(updatedTodos);

    Promise.all(
      todosToUpdate.map(todo =>
        updateTodo({ ...todo, completed: !areAllCompleted }),
      ),
    ).catch(() => {
      setErrorMessage('Unable to update some todos');
    });
  }

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 3000);

      return () => {
        clearTimeout(timer);
      };
    }

    return undefined;
  }, [errorMessage]);

  function handleEdit(todo: Todo, event?: React.ChangeEvent<HTMLInputElement>) {
    if (!event) {
      setEditingTitle(todo.title);
      setEditingTodoId(todo.id);

      return;
    }

    if (event.type === 'change') {
      setEditingTitle(event.target.value);

      return;
    }

    if (event.type === 'blur' || ('key' in event && event.key === 'Enter')) {
      const trimmedTitle = editingTitle.trim();

      if (trimmedTitle === todo.title) {
        setEditingTodoId(null);

        return;
      }

      if (trimmedTitle) {
        const updatedTodo = { ...todo, title: trimmedTitle };

        updateTodo(updatedTodo)
          .then(() => {
            setEditingTodoId(null);
          })
          .catch(() => {
            setErrorMessage('Unable to update a todo');
          });
      } else {
        deleteTodo(todo.id)
          .then(() => {
            setEditingTodoId(null);
          })
          .catch(() => {
            setErrorMessage('Unable to delete a todo');
          });
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setEditingTodoId(null);
    }
  }

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case Filter.All:
        return todos;
      case Filter.Active:
        return todos.filter(todo => !todo.completed);
      case Filter.Completed:
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  function handleDeleteAllCompletedTodos(completedTodos: Todo[]) {
    const completedIds = completedTodos.map(todo => todo.id);

    setLoadingTodoId(completedIds);

    const deletePromises = completedTodos.map(todo =>
      deleteTodo(todo.id)
        .then(() => todo.id)
        .catch(() => {
          setErrorMessage('Unable to delete a todo');

          return Promise.reject(todo.id);
        }),
    );

    Promise.allSettled(deletePromises)
      .then(results => {
        const successfulIds = results
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<number>).value);

        const failedIds = results
          .filter(result => result.status === 'rejected')
          .map((_, index) => completedIds[index]);

        setTodos(prevTodos =>
          prevTodos.filter(todo => !successfulIds.includes(todo.id)),
        );

        if (failedIds.length > 0) {
          setErrorMessage('Unable to delete some todos');
        }
      })
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
      })
      .finally(() => {
        setLoadingTodoId(null);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
      });
  }

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={`todoapp__toggle-all ${todos.every(todo => todo.completed) ? 'active' : ''}`}
              data-cy="ToggleAllButton"
              onClick={() => {
                handleChangeAllTodosCompleted();
              }}
            />
          )}

          <form
            onSubmit={event => {
              event.preventDefault();

              if (!todoTitle.trim()) {
                setErrorMessage('Title should not be empty');
              }

              if (todoTitle.trim()) {
                addTodo({
                  title: todoTitle.trim(),
                  completed: false,
                  userId: USER_ID,
                });
              }
            }}
          >
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={todoTitle}
              onChange={event => setTodoTitle(event.target.value)}
              disabled={loadingTodoId !== null}
              autoFocus
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={`todo ${todo.completed && 'completed'}`}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleChangeTodoCompleted(todo.id)}
                />
              </label>

              {editingTodoId === todo.id ? (
                <input
                  data-cy="TodoTitleField"
                  type="text"
                  className="todo__title-field"
                  placeholder="Empty todo will be deleted"
                  value={editingTitle}
                  onChange={event => handleEdit(todo, event)}
                  onBlur={event => handleEdit(todo, event)}
                  onKeyDown={event => handleKeyDown(event)}
                  autoFocus
                />
              ) : (
                <>
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() => handleEdit(todo)}
                  >
                    {todo.title}
                  </span>

                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    x
                  </button>
                </>
              )}

              <div
                data-cy="TodoLoader"
                className={`modal overlay ${loadingTodoId?.includes(todo.id) || loadingAllTodos ? 'is-active' : ''}`}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${todos.filter(todo => !todo.completed && todo.id !== -1).length} items left`}
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filter === Filter.All ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilter(Filter.All)}
              >
                All
              </a>

              <a
                href="#/active"
                className={`filter__link ${filter === Filter.Active ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilter(Filter.Active)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={`filter__link ${filter === Filter.Completed ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter(Filter.Completed)}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(todo => todo.completed)}
              onClick={() => {
                const completedTodos = todos.filter(todo => todo.completed);

                handleDeleteAllCompletedTodos(completedTodos);
              }}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${!errorMessage.trim() ? 'hidden' : ''}`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
      </div>
    </div>
  );
};
