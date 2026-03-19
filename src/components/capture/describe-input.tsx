"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface DescribeInputProps {
  onSubmit: (text: string) => void;
  className?: string;
}

const QUICK_TAGS = [
  { label: "Dark", category: "mood" },
  { label: "Uplifting", category: "mood" },
  { label: "Melancholic", category: "mood" },
  { label: "Aggressive", category: "mood" },
  { label: "Dreamy", category: "mood" },
  { label: "Lo-fi", category: "genre" },
  { label: "Rock", category: "genre" },
  { label: "Electronic", category: "genre" },
  { label: "Jazz", category: "genre" },
  { label: "Hip-hop", category: "genre" },
  { label: "Ambient", category: "genre" },
  { label: "Minor key", category: "musical" },
  { label: "Major key", category: "musical" },
  { label: "Driving bass", category: "musical" },
  { label: "Sparse", category: "musical" },
] as const;

export function DescribeInput({ onSubmit, className }: DescribeInputProps) {
  const [text, setText] = useState("");

  function handleTagClick(tag: string) {
    setText((prev) => {
      const trimmed = prev.trim();
      if (trimmed.length === 0) return tag;
      // Avoid duplicates
      if (trimmed.toLowerCase().includes(tag.toLowerCase())) return trimmed;
      return `${trimmed}, ${tag.toLowerCase()}`;
    });
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you're hearing... e.g., 'dark minor key, driving bass, something like Radiohead meets Massive Attack'"
        autoResize
        className="min-h-[100px] text-sm"
      />

      {/* Quick tags */}
      <div>
        <span className="text-xs text-slate-500 mb-2 block">Quick tags</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => handleTagClick(tag.label)}
              className="transition-colors"
            >
              <Badge
                variant={tag.category === "mood" ? "info" : tag.category === "genre" ? "warning" : "default"}
                className="cursor-pointer hover:opacity-80"
              >
                {tag.label}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        disabled={text.trim().length === 0}
      >
        Submit to AI
      </Button>

      <p className="text-xs text-slate-600 text-center">
        Cmd+Enter to submit
      </p>
    </div>
  );
}
