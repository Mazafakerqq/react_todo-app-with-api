/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Dispatch, RefObject } from 'react';
import { Todo } from '../types/Todo';

interface TodolistProps {
  loadingTodoId: number[] | null;
  setLoadingTodoId: Dispatch<React.SetStateAction<number[] | null>>;
  loadingAllTodos: boolean;
  setErrorMessage: Dispatch<React.SetStateAction<string>>;
  setTodos: Dispatch<React.SetStateAction<Todo[]>>;
  todos: Todo[];
  inputRef: RefObject<HTMLInputElement>;
  updateTodo: (updatedTodo: Todo) => Promise<void>;
  editingTitle: string;
  setEditingTitle: Dispatch<React.SetStateAction<string>>;
  editingTodoId: number | null;
  setEditingTodoId: Dispatch<React.SetStateAction<number | null>>;
  filteredTodos: Todo[];
  deleteTodo: (todoId: number) => Promise<void>;
}

export const TodoList: React.FC<TodolistProps> = ({
  loadingTodoId,
  loadingAllTodos,
  setErrorMessage,
  todos,
  updateTodo,
  editingTitle,
  setEditingTitle,
  editingTodoId,
  setEditingTodoId,
  filteredTodos,
  deleteTodo,
}) => {
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

  return (
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
  );
};
