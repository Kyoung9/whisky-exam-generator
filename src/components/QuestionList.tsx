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
import { SourceQuestionDialog } from "@/components/SourceQuestionDialog";
import { PastExamReferencesDialog } from "@/components/PastExamReferencesDialog";
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
  onShowSource,
  onShowPastExamReferences,
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
  onShowSource?: () => void;
  onShowPastExamReferences?: () => void;
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
          onShowSource={onShowSource}
          onShowPastExamReferences={onShowPastExamReferences}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      )}
    </div>
  );
}

// 一覧 + 一括操作 + DnD (README §3.5–§3.10) - WhiskyQuest dark トーン
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
  const [sourceForModal, setSourceForModal] = useState<GeneratedQuestion | null>(
    null,
  );
  const [pastRefsForModal, setPastRefsForModal] = useState<string[] | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
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
      <div className="border-glass-stroke rounded-xl border border-dashed px-6 py-12 text-center">
        <span
          className="material-symbols-outlined text-amber-gold/40 mb-3 text-5xl"
          aria-hidden="true"
        >
          inventory_2
        </span>
        <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
          まだ問題がありません。上のフォームから生成してください。
        </p>
      </div>
    );
  }

  const allSelected = questions.every((q) => q.selected);
  const selectedIds = questions.filter((q) => q.selected).map((q) => q.id);

  return (
    <div className="space-y-4">
      <div className="border-glass-stroke flex flex-wrap items-center gap-2 rounded-lg border bg-white/[0.02] px-3 py-3 sm:px-4">
        <span className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
          {questions.length} 問
        </span>
        <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          選択中 {selectedIds.length}
        </span>
        <div className="ml-auto flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={() => selectAll(!allSelected)}
            className="amber-cta-outline min-h-10"
          >
            {allSelected ? "全解除" : "全選択"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedIds.length === 0) return;
              if (
                !confirm(`選択した ${selectedIds.length} 問を削除しますか?`)
              )
                return;
              removeMany(selectedIds);
            }}
            disabled={selectedIds.length === 0}
            className="text-label-caps border-error/60 text-error hover:bg-error/10 min-h-10 rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
            {questions.map((q, i) => {
              const pastIds = q.sourcePastExamIds;
              return (
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
                    if (confirm("この問題を削除しますか?")) remove(q.id);
                  }}
                  onToggleSelect={() => toggleSelect(q.id)}
                  onMoveUp={i > 0 ? () => move(q.id, "up") : undefined}
                  onMoveDown={
                    i < questions.length - 1
                      ? () => move(q.id, "down")
                      : undefined
                  }
                  onGenerateSimilar={
                    onGenerateSimilar ? () => onGenerateSimilar(q) : undefined
                  }
                  onShowSource={
                    q.sourceQuestionId
                      ? () => {
                          const found = questions.find(
                            (item) => item.id === q.sourceQuestionId,
                          );
                          if (found) {
                            setSourceForModal(found);
                          }
                        }
                      : undefined
                  }
                  onShowPastExamReferences={
                    pastIds && pastIds.length > 0
                      ? () => setPastRefsForModal([...pastIds])
                      : undefined
                  }
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      {sourceForModal && (
        <SourceQuestionDialog
          source={sourceForModal}
          onClose={() => setSourceForModal(null)}
        />
      )}
      {pastRefsForModal && (
        <PastExamReferencesDialog
          key={pastRefsForModal.join("|")}
          pastExamIds={pastRefsForModal}
          onClose={() => setPastRefsForModal(null)}
        />
      )}
    </div>
  );
}
