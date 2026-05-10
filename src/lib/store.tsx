"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { GeneratedQuestion } from "@/types/question";
import { loadQuestions, saveQuestions } from "@/lib/storage";

type State = {
  questions: GeneratedQuestion[];
  hydrated: boolean;
};

type Action =
  | { type: "hydrate"; questions: GeneratedQuestion[] }
  | { type: "set"; questions: GeneratedQuestion[] }
  | { type: "append"; questions: GeneratedQuestion[] }
  | { type: "appendAfter"; afterId: string; questions: GeneratedQuestion[] }
  | { type: "update"; id: string; patch: Partial<GeneratedQuestion> }
  | { type: "remove"; id: string }
  | { type: "removeMany"; ids: string[] }
  | { type: "toggleSelect"; id: string }
  | { type: "selectAll"; selected: boolean }
  | { type: "reorder"; ids: string[] }
  | { type: "move"; id: string; direction: "up" | "down" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { questions: action.questions, hydrated: true };
    case "set":
      return { ...state, questions: action.questions };
    case "append":
      return { ...state, questions: [...state.questions, ...action.questions] };
    case "appendAfter": {
      const idx = state.questions.findIndex((q) => q.id === action.afterId);
      if (idx < 0) {
        return { ...state, questions: [...state.questions, ...action.questions] };
      }
      const next = [...state.questions];
      next.splice(idx + 1, 0, ...action.questions);
      return { ...state, questions: next };
    }
    case "update":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.id ? { ...q, ...action.patch } : q
        ),
      };
    case "remove":
      return {
        ...state,
        questions: state.questions.filter((q) => q.id !== action.id),
      };
    case "removeMany": {
      const set = new Set(action.ids);
      return { ...state, questions: state.questions.filter((q) => !set.has(q.id)) };
    }
    case "toggleSelect":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.id ? { ...q, selected: !q.selected } : q
        ),
      };
    case "selectAll":
      return {
        ...state,
        questions: state.questions.map((q) => ({ ...q, selected: action.selected })),
      };
    case "reorder": {
      const map = new Map(state.questions.map((q) => [q.id, q] as const));
      const next: GeneratedQuestion[] = [];
      for (const id of action.ids) {
        const q = map.get(id);
        if (q) {
          next.push(q);
          map.delete(id);
        }
      }
      // 漏れた要素は末尾に
      for (const q of map.values()) next.push(q);
      return { ...state, questions: next };
    }
    case "move": {
      const idx = state.questions.findIndex((q) => q.id === action.id);
      if (idx < 0) return state;
      const target = action.direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= state.questions.length) return state;
      const next = [...state.questions];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...state, questions: next };
    }
    default:
      return state;
  }
}

type StoreValue = {
  questions: GeneratedQuestion[];
  hydrated: boolean;
  setQuestions: (qs: GeneratedQuestion[]) => void;
  append: (qs: GeneratedQuestion[]) => void;
  appendAfter: (afterId: string, qs: GeneratedQuestion[]) => void;
  update: (id: string, patch: Partial<GeneratedQuestion>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: (selected: boolean) => void;
  reorder: (ids: string[]) => void;
  move: (id: string, direction: "up" | "down") => void;
};

const QuestionsContext = createContext<StoreValue | null>(null);

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    questions: [],
    hydrated: false,
  });
  const hydratedRef = useRef(false);

  useEffect(() => {
    const loaded = loadQuestions();
    dispatch({ type: "hydrate", questions: loaded ?? [] });
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    saveQuestions(state.questions);
  }, [state.questions, state.hydrated]);

  const value: StoreValue = {
    questions: state.questions,
    hydrated: state.hydrated,
    setQuestions: useCallback((qs) => dispatch({ type: "set", questions: qs }), []),
    append: useCallback((qs) => dispatch({ type: "append", questions: qs }), []),
    appendAfter: useCallback(
      (afterId, qs) => dispatch({ type: "appendAfter", afterId, questions: qs }),
      []
    ),
    update: useCallback(
      (id, patch) => dispatch({ type: "update", id, patch }),
      []
    ),
    remove: useCallback((id) => dispatch({ type: "remove", id }), []),
    removeMany: useCallback((ids) => dispatch({ type: "removeMany", ids }), []),
    toggleSelect: useCallback((id) => dispatch({ type: "toggleSelect", id }), []),
    selectAll: useCallback(
      (selected) => dispatch({ type: "selectAll", selected }),
      []
    ),
    reorder: useCallback((ids) => dispatch({ type: "reorder", ids }), []),
    move: useCallback(
      (id, direction) => dispatch({ type: "move", id, direction }),
      []
    ),
  };

  return (
    <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>
  );
}

export function useQuestions(): StoreValue {
  const ctx = useContext(QuestionsContext);
  if (!ctx) {
    throw new Error("useQuestions must be used inside <QuestionsProvider>");
  }
  return ctx;
}
