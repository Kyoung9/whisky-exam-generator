"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { QuestionCard } from "@/components/QuestionCard";
import { QuestionEditor } from "@/components/QuestionEditor";
import { useQuestions } from "@/lib/store";
import type { GeneratedQuestion } from "@/types/question";

type SimilarHandler = (question: GeneratedQuestion) => void | Promise<void>;

type Props = {
  onGenerateSimilar?: SimilarHandler;
};

function SortableItem({
  question,
  index,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  onGenerateSimilar,
}: {
  question: GeneratedQuestion;
  index: number;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<GeneratedQuestion>) => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onGenerateSimilar?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {editing ? (
        <QuestionEditor question={question} onSave={onSave} onCancel={onCancelEdit} />
      ) : (
        <QuestionCard
          index={index}
          question={question}
          onEdit={onStartEdit}
          onDelete={onDelete}
          onToggleSelect={onToggleSelect}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onGenerateSimilar={onGenerateSimilar}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      )}
    </div>
  );
}

// 一覧 + 一括操作 + DnD（README §3.5–§3.10）
export function QuestionList({ onGenerateSimilar }: Props) {
  const {
    questions,
    update,
    remove,
    removeMany,
    toggleSelect,
    selectAll,
    reorder,
    move,
  } = useQuestions();
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorder(arrayMove(ids, from, to));
  }

  if (questions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-white px-6 py-10 text-center text-sm text-muted-foreground">
        まだ問題がありません。上のフォームから生成してください。
      </p>
    );
  }

  const allSelected = questions.every((q) => q.selected);
  const selectedIds = questions.filter((q) => q.selected).map((q) => q.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
        <span className="font-medium">{questions.length} 問</span>
        <span className="text-muted-foreground">
          （選択中 {selectedIds.length} 問）
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectAll(!allSelected)}
            className="rounded border px-3 py-1 hover:bg-stone-50"
          >
            {allSelected ? "全解除" : "全選択"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedIds.length === 0) return;
              if (!confirm(`選択した ${selectedIds.length} 問を削除しますか？`)) return;
              removeMany(selectedIds);
            }}
            disabled={selectedIds.length === 0}
            className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            選択を一括削除
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {questions.map((q, i) => (
              <SortableItem
                key={q.id}
                question={q}
                index={i}
                editing={editingId === q.id}
                onStartEdit={() => setEditingId(q.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(patch) => {
                  update(q.id, patch);
                  setEditingId(null);
                }}
                onDelete={() => {
                  if (confirm("この問題を削除しますか？")) remove(q.id);
                }}
                onToggleSelect={() => toggleSelect(q.id)}
                onMoveUp={i > 0 ? () => move(q.id, "up") : undefined}
                onMoveDown={
                  i < questions.length - 1 ? () => move(q.id, "down") : undefined
                }
                onGenerateSimilar={
                  onGenerateSimilar ? () => onGenerateSimilar(q) : undefined
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
