import { useMemo, useState } from "react";
import type { AssistantProfileSyncState, LocalAssistantProfile, UseCase } from "../types";
import { Input, ModalBackdrop, ModalPanel, PrimaryButton, SecondaryButton } from "../components/ui";
import { cn } from "../lib/utils";
import { legacyDefaultAssistantPurpose, legacyDefaultDesiredTasks } from "../features/assistants/profile";

type MyAssistantsPanelProps = {
  profiles: LocalAssistantProfile[];
  activeProfileId: string;
  syncState: AssistantProfileSyncState;
  syncMessage: string | null;
  onEdit: (profile: LocalAssistantProfile) => void;
  onSync: (profile: LocalAssistantProfile) => void;
  onSyncAll: () => void;
  onSyncAllFromWeb: () => void;
  onAddAssistant: () => void;
  onRun: (profile: LocalAssistantProfile) => void;
  onDelete: (profile: LocalAssistantProfile) => Promise<void> | void;
  onRename: (profile: LocalAssistantProfile, name: string) => Promise<void> | void;
};

type AssistantCategoryId = "study" | "writing" | "work" | "coding" | "planning" | "creative" | "personal";
type AssistantFilterId = "all" | AssistantCategoryId;
type SortKey = "updated" | "name" | "role" | "provider";

type AssistantCategory = {
  id: AssistantCategoryId;
  label: string;
  tabLabel: string;
  icon: string;
  avatarClassName: string;
  useCases: UseCase[];
  purposeMatches: string[];
  keywords: string[];
};

const defaultDescription = "Local MiVA assistant profile created from setup choices.";
const defaultPurpose = legacyDefaultAssistantPurpose;
const defaultTasks = legacyDefaultDesiredTasks;

const assistantCategories: AssistantCategory[] = [
  {
    id: "study",
    label: "Study & Learning",
    tabLabel: "Study",
    icon: "ph-book-open",
    avatarClassName: "bg-[#fff3db] text-[#d66a00]",
    useCases: ["study"],
    purposeMatches: ["study & learning"],
    keywords: ["study", "learn", "learning", "school", "class", "lecture", "homework", "exam", "tutor", "math", "language"],
  },
  {
    id: "writing",
    label: "Writing & Content",
    tabLabel: "Writing",
    icon: "ph-pen-nib",
    avatarClassName: "bg-[#e7f0ff] text-[#2563eb]",
    useCases: [],
    purposeMatches: ["writing & communication"],
    keywords: ["write", "writing", "content", "copy", "blog", "email", "essay", "rewrite", "grammar", "communication"],
  },
  {
    id: "work",
    label: "Work & Productivity",
    tabLabel: "Work",
    icon: "ph-briefcase",
    avatarClassName: "bg-[#e7f8ef] text-[#12844d]",
    useCases: ["work"],
    purposeMatches: ["work & productivity"],
    keywords: ["work", "project", "meeting", "productivity", "manager", "data", "report", "business", "task"],
  },
  {
    id: "coding",
    label: "Coding & Debugging",
    tabLabel: "Coding",
    icon: "ph-code",
    avatarClassName: "bg-[#e6f8fb] text-[#0f7f94]",
    useCases: [],
    purposeMatches: ["coding & developer workflow"],
    keywords: ["code", "coding", "debug", "developer", "python", "react", "api", "repository", "programming"],
  },
  {
    id: "planning",
    label: "Planning & Research",
    tabLabel: "Planning",
    icon: "ph-magnifying-glass",
    avatarClassName: "bg-[#eaf5ff] text-[#0b78d0]",
    useCases: [],
    purposeMatches: ["planning & life"],
    keywords: ["plan", "planning", "research", "travel", "schedule", "itinerary", "organize", "compare"],
  },
  {
    id: "creative",
    label: "Creative & Ideas",
    tabLabel: "Creative",
    icon: "ph-paint-brush",
    avatarClassName: "bg-[#f4e8ff] text-[#8b3fd1]",
    useCases: [],
    purposeMatches: ["creative & ideas"],
    keywords: ["creative", "idea", "story", "brainstorm", "branding", "naming", "design", "art"],
  },
  {
    id: "personal",
    label: "Personal & Daily Life",
    tabLabel: "Personal",
    icon: "ph-user-circle",
    avatarClassName: "bg-[#e9fbe9] text-[#149447]",
    useCases: ["daily", "fast", "character"],
    purposeMatches: ["fun & companion", "something else"],
    keywords: ["daily", "personal", "life", "habit", "health", "coach", "companion", "routine", "home", "casual", "roleplay", "game-like"],
  },
];

const categoryById = new Map(assistantCategories.map((category) => [category.id, category]));
const categoryIdByStarterLabel = new Map<string, AssistantCategoryId>([
  ["study & learning", "study"],
  ["writing & communication", "writing"],
  ["work & productivity", "work"],
  ["coding & developer workflow", "coding"],
  ["planning & life", "planning"],
  ["creative & ideas", "creative"],
  ["fun & companion", "personal"],
]);

function normalizeCategoryText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function sentenceSummary(value: string, fallback: string, maxLength = 96) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  const firstSentence = normalized.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? normalized;
  return firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 3)}...` : firstSentence;
}

function getAssistantPurpose(profile: LocalAssistantProfile) {
  const purpose = profile.prompt?.settings?.simple?.assistantPurpose?.trim() ?? "";
  return purpose === defaultPurpose ? "" : purpose;
}

function meaningfulPromptText(value: unknown, legacyDefault?: string) {
  if (typeof value !== "string") {
    return "";
  }

  const text = value.trim();
  if (!text || text === legacyDefault || text === defaultDescription) {
    return "";
  }

  return text;
}

function getFixedPromptCategory(profile: LocalAssistantProfile) {
  const variableCategory = profile.prompt?.variables?.assistantCategory;
  if (typeof variableCategory === "string") {
    const category = categoryById.get(variableCategory as AssistantCategoryId);
    if (category) {
      return category;
    }
  }

  const purpose = normalizeCategoryText(getAssistantPurpose(profile));
  if (!purpose) {
    return null;
  }

  const directCategoryId = categoryIdByStarterLabel.get(purpose);
  if (directCategoryId) {
    return categoryById.get(directCategoryId) ?? null;
  }

  for (const [label, categoryId] of categoryIdByStarterLabel) {
    if (purpose.startsWith(`${label} - `)) {
      return categoryById.get(categoryId) ?? null;
    }
  }

  return null;
}

function getAssistantRole(profile: LocalAssistantProfile) {
  const purpose = getAssistantPurpose(profile);
  if (purpose && purpose !== defaultPurpose) {
    return sentenceSummary(purpose.split(" - ")[0] ?? purpose, "Custom assistant", 72);
  }

  if (profile.useCase) {
    return `${profile.useCase[0].toUpperCase()}${profile.useCase.slice(1)} assistant`;
  }

  return "Custom assistant";
}

function getAssistantBrief(profile: LocalAssistantProfile) {
  const desiredTasks = profile.prompt?.settings?.simple?.desiredTasks?.trim();
  if (desiredTasks && desiredTasks !== defaultTasks) {
    return sentenceSummary(desiredTasks, "No prompt brief yet.", 92);
  }

  const description = meaningfulPromptText(profile.description);
  if (description) {
    return sentenceSummary(description, "No prompt brief yet.", 92);
  }

  return "No prompt brief yet.";
}

function getAssistantCategory(profile: LocalAssistantProfile) {
  const fixedPromptCategory = getFixedPromptCategory(profile);
  if (fixedPromptCategory) {
    return fixedPromptCategory;
  }

  const haystack = [
    profile.name,
    meaningfulPromptText(profile.description),
    getAssistantPurpose(profile),
    meaningfulPromptText(profile.prompt?.settings?.simple?.desiredTasks, defaultTasks),
  ].filter(Boolean).join(" ").toLowerCase();

  const promptCategory = assistantCategories.find((category) => (
    category.purposeMatches.some((value) => haystack.includes(value))
  ));
  if (promptCategory) {
    return promptCategory;
  }

  const keywordCategory = assistantCategories.find((category) => (
    category.keywords.some((keyword) => haystack.includes(keyword))
  ));
  if (keywordCategory) {
    return keywordCategory;
  }

  const useCaseCategory = assistantCategories.find((category) => (
    profile.useCase && category.useCases.includes(profile.useCase)
  ));
  if (useCaseCategory) {
    return useCaseCategory;
  }

  return categoryById.get("personal")!;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "AI";
  }

  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function getModelLabel(profile: LocalAssistantProfile) {
  return (profile.modelLabel || profile.model || profile.provider || "Model").replace(/^openai:/i, "").toUpperCase();
}

function getSearchText(profile: LocalAssistantProfile) {
  return [
    profile.name,
    profile.description,
    getAssistantRole(profile),
    getAssistantBrief(profile),
    getModelLabel(profile),
    profile.provider,
    profile.useCase,
  ].filter(Boolean).join(" ").toLowerCase();
}

function sortProfiles(profiles: LocalAssistantProfile[], sortKey: SortKey, activeProfileId: string) {
  return [...profiles].sort((a, b) => {
    if (a.id === activeProfileId && b.id !== activeProfileId) {
      return -1;
    }
    if (b.id === activeProfileId && a.id !== activeProfileId) {
      return 1;
    }

    if (sortKey === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortKey === "role") {
      return getAssistantRole(a).localeCompare(getAssistantRole(b));
    }
    if (sortKey === "provider") {
      return getModelLabel(a).localeCompare(getModelLabel(b));
    }

    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });
}

function AssistantLibraryCard({
  category,
  selected,
  profile,
  syncState,
  onDelete,
  onEdit,
  onRename,
  onRun,
  onSelect,
  onSync,
  menuOpen,
  onToggleMenu,
}: {
  category: AssistantCategory;
  selected: boolean;
  profile: LocalAssistantProfile;
  syncState: AssistantProfileSyncState;
  onDelete: () => void;
  onEdit: () => void;
  onRename: () => void;
  onRun: () => void;
  onSelect: () => void;
  onSync: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const syncLabel = syncState === "syncing" ? "Syncing..." : profile.sync?.cloudEnabled ? "Synced" : "Local only";
  const syncClassName = profile.sync?.cloudEnabled
    ? "text-slate-400"
    : "text-slate-400";

  return (
    <article
      aria-selected={selected}
      className={cn(
        "assistant-card group relative grid min-h-[126px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-visible rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md",
        selected
          ? "assistant-card-selected border-blue-200 border-l-4 border-l-blue-600 bg-blue-50/30 shadow-[0_12px_28px_rgba(37,99,235,0.13)]"
          : "",
      )}
      onClick={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button")) {
          return;
        }
        onSelect();
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold", category.avatarClassName)}>
          {getInitials(profile.name)}
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
          {getModelLabel(profile)}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <h3 className="truncate text-sm font-bold text-slate-900">{profile.name}</h3>
        <p className="mb-3 mt-0.5 line-clamp-1 text-xs text-slate-500">{getAssistantBrief(profile)}</p>
      </div>

      <div className={cn("flex min-w-0 items-center justify-between gap-2 border-t pt-3", selected ? "border-blue-100/50" : "border-slate-50")}>
        <div className="min-w-0 text-[10px] leading-4">
          <p className={cn("flex truncate items-center gap-1", selected ? "font-semibold text-blue-600" : syncClassName)}>
            <i className={cn("ph text-[13px]", profile.sync?.cloudEnabled ? "ph-check-circle" : "ph-warning-circle")} />
            {syncLabel}
          </p>
        </div>
        <div className={cn("action-buttons flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100", menuOpen && "opacity-100")}>
          <button
            aria-label={`Run ${profile.name}`}
            className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation();
              onRun();
            }}
            title="Run"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              play_arrow
            </span>
          </button>
          <button
            aria-label={`Edit ${profile.name}`}
            className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            title="Edit"
            type="button"
          >
            <i className="ph ph-pencil-simple text-base" />
          </button>
          <button
            aria-expanded={menuOpen}
            aria-label={`More actions for ${profile.name}`}
            className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation();
              onToggleMenu();
            }}
            title="More"
            type="button"
          >
            <i className="ph ph-dots-three-vertical text-[17px]" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute right-3 top-full z-30 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 text-xs text-slate-700 shadow-lg" onClick={(event) => event.stopPropagation()}>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
            disabled={syncState === "syncing"}
            onClick={onSync}
            type="button"
          >
            <i className="ph ph-arrows-clockwise text-[15px]" />
            Sync
          </button>
          <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50" onClick={onRename} type="button">
            <i className="ph ph-pencil-simple text-[15px]" />
            Rename
          </button>
          <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={onDelete} type="button">
            <i className="ph ph-trash text-[15px]" />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

export function MyAssistantsPanel({
  profiles,
  activeProfileId,
  syncState,
  syncMessage,
  onEdit,
  onSync,
  onSyncAll,
  onSyncAllFromWeb,
  onAddAssistant,
  onRun,
  onDelete,
  onRename,
}: MyAssistantsPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<LocalAssistantProfile | null>(null);
  const [renameTarget, setRenameTarget] = useState<LocalAssistantProfile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AssistantFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<AssistantCategoryId[]>([]);
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const categorizedProfiles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
    const activeCategoryId = activeProfile ? getAssistantCategory(activeProfile).id : null;
    const visibleProfiles = profiles.filter((profile) => {
      const category = getAssistantCategory(profile);
      const matchesFilter = activeFilter === "all" || category.id === activeFilter;
      const matchesSearch = !normalizedQuery || getSearchText(profile).includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });

    return assistantCategories
      .map((category) => ({
        category,
        profiles: sortProfiles(visibleProfiles.filter((profile) => getAssistantCategory(profile).id === category.id), sortKey, activeProfileId),
        total: profiles.filter((profile) => getAssistantCategory(profile).id === category.id).length,
      }))
      .sort((a, b) => {
        if (activeFilter !== "all" || !activeCategoryId) {
          return 0;
        }
        if (a.category.id === activeCategoryId && b.category.id !== activeCategoryId) {
          return -1;
        }
        if (b.category.id === activeCategoryId && a.category.id !== activeCategoryId) {
          return 1;
        }
        return 0;
      });
  }, [activeFilter, activeProfileId, profiles, searchQuery, sortKey]);

  const visibleSections = categorizedProfiles.filter((section) => {
    if (activeFilter !== "all") {
      return activeFilter === section.category.id;
    }
    if (searchQuery.trim()) {
      return section.profiles.length > 0;
    }
    return true;
  });
  const visibleProfileCount = visibleSections.reduce((total, section) => total + section.profiles.length, 0);

  const openRename = (profile: LocalAssistantProfile) => {
    setRenameTarget(profile);
    setRenameValue(profile.name);
    setRenameError(null);
  };

  const confirmRename = async () => {
    if (!renameTarget) {
      return;
    }

    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      setRenameError("Assistant name is required.");
      return;
    }

    const duplicate = profiles.some((profile) => (
      profile.id !== renameTarget.id && profile.name.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    ));
    if (duplicate) {
      setRenameError("An assistant with this name already exists.");
      return;
    }

    await onRename(renameTarget, trimmedName);
    setRenameTarget(null);
    setRenameValue("");
    setRenameError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setDeleteTarget(null);
    await onDelete(target);
  };

  const toggleCategory = (categoryId: AssistantCategoryId) => {
    setCollapsedCategoryIds((current) => (
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    ));
  };

  return (
    <div className="miva-studio-design flex h-full min-h-0 min-w-[1120px] flex-col bg-[#F8FAFC] text-slate-900">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-8">
        <div className="space-y-4 p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[14px] font-bold leading-5 text-white shadow-sm transition-all hover:bg-blue-700"
                onClick={onAddAssistant}
                type="button"
              >
                <i className="ph ph-plus-circle text-lg" />
                Create Assistant
              </button>
              <div className="mx-2 h-6 w-px bg-slate-200" />
              <button
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[14px] font-bold leading-5 text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                disabled={syncState === "syncing"}
                onClick={onSyncAll}
                type="button"
              >
                <i className={cn("ph text-lg text-slate-500", syncState === "syncing" ? "ph-arrows-clockwise animate-spin" : "ph-cloud-arrow-up")} />
                Sync all to web
              </button>
              <button
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[14px] font-bold leading-5 text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                disabled={syncState === "syncing"}
                onClick={onSyncAllFromWeb}
                type="button"
              >
                <i className="ph ph-cloud-arrow-down text-lg text-slate-500" />
                Sync from web
              </button>
            </div>
          </div>

          <div className="flex min-w-[1072px] items-center justify-between rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <div className="flex shrink-0 items-center gap-0.5">
              {[{ id: "all" as const, tabLabel: "All" }, ...assistantCategories].map((item) => {
                const active = activeFilter === item.id;
                return (
                  <button
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[14px] font-bold leading-5 text-slate-500 transition hover:text-slate-700",
                      active && "bg-blue-50 text-blue-600",
                    )}
                    key={item.id}
                    onClick={() => setActiveFilter(item.id)}
                    type="button"
                  >
                    {item.tabLabel}
                  </button>
                );
              })}
            </div>
            <div className="ml-8 flex shrink-0 items-center gap-2 pr-2">
              <div className="relative">
                <i className="ph ph-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400" />
                <input
                  aria-label="Search assistants"
                  className="w-56 border-none bg-transparent py-1.5 pl-9 pr-4 text-[14px] leading-5 placeholder:text-slate-400 focus:outline-none"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search assistants..."
                  type="text"
                  value={searchQuery}
                />
              </div>
              <div className="mx-1 h-4 w-px bg-slate-200" />
              <div className="flex min-w-[190px] items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] font-medium leading-5 text-slate-500 hover:bg-slate-50">
                <i className="ph ph-sort-ascending text-lg" />
                <select
                  aria-label="Sort assistants"
                  className="w-full border-none bg-transparent text-[14px] font-medium leading-5 text-slate-500 outline-none"
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  value={sortKey}
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="role">Role</option>
                  <option value="provider">Provider</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      {syncMessage && (
        <div
          className={`mx-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
            syncState === "error"
              ? "border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)]"
              : "border-slate-200 bg-white text-slate-500"
          }`}
          role={syncState === "error" ? "alert" : "status"}
        >
          {syncMessage}
        </div>
      )}

      <div className="space-y-6 p-6 pt-2">
        {profiles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
            <p className="text-sm font-bold text-slate-800">No assistants yet.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Create your first assistant to start building a role-based library.</p>
            <PrimaryButton className="mt-4 h-10 px-4 text-sm" onClick={onAddAssistant}>Create Assistant</PrimaryButton>
          </div>
        ) : visibleProfileCount === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
            <p className="text-sm font-bold text-slate-800">No assistants match this view.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Try another category, search term, or sort option.</p>
          </div>
        ) : (
          visibleSections.map(({ category, profiles: sectionProfiles, total }) => {
            const collapsed = collapsedCategoryIds.includes(category.id);

            return (
              <section className="min-w-0" key={category.id}>
                <button
                  className="group mb-4 flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 border-b border-slate-100 py-2 text-left"
                  onClick={() => toggleCategory(category.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <i className={`ph ${category.icon} text-lg text-blue-600`} />
                    <span className="truncate font-bold text-slate-800">{category.label}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-400">{total}</span>
                  </span>
                  <i className={`ph ${collapsed ? "ph-caret-right" : "ph-caret-down"} shrink-0 text-lg text-slate-400 transition-colors group-hover:text-slate-600`} />
                </button>

                {!collapsed && (
                  sectionProfiles.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {sectionProfiles.map((profile) => (
                        <AssistantLibraryCard
                          category={category}
                          key={profile.id}
                          menuOpen={menuTargetId === profile.id}
                          onDelete={() => {
                            setMenuTargetId(null);
                            setSelectedProfileId((current) => current === profile.id ? null : current);
                            setDeleteTarget(profile);
                          }}
                          onEdit={() => {
                            setMenuTargetId(null);
                            onEdit(profile);
                          }}
                          onRename={() => {
                            setMenuTargetId(null);
                            openRename(profile);
                          }}
                          onRun={() => onRun(profile)}
                          onSelect={() => setSelectedProfileId(profile.id)}
                          onSync={() => {
                            setMenuTargetId(null);
                            onSync(profile);
                          }}
                          onToggleMenu={() => setMenuTargetId((current) => current === profile.id ? null : profile.id)}
                          profile={profile}
                          selected={selectedProfileId === profile.id}
                          syncState={syncState}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="col-span-full flex items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs font-medium text-slate-400">
                      <span className="italic">No assistants yet in this category.</span>
                      <button className="font-bold text-blue-600 hover:underline" onClick={onAddAssistant} type="button">Add one +</button>
                    </div>
                  )
                )}
              </section>
            );
          })
        )}
      </div>
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 text-[11px] font-medium text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", syncState === "error" ? "bg-red-500" : "bg-green-500")} />
            {syncState === "syncing" ? "Cloud sync in progress" : syncState === "error" ? "Cloud sync needs attention" : "Cloud sync active"}
          </span>
          <span>{profiles.length} assistant profiles</span>
        </div>
      </footer>

      {renameTarget && (
        <ModalBackdrop>
          <ModalPanel className="max-w-[420px]">
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Rename assistant</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Update the assistant name shown in Studio and Runtime.</p>
            <Input
              autoFocus
              className="mt-5 text-base font-semibold"
              onChange={(event) => {
                setRenameValue(event.target.value);
                setRenameError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void confirmRename();
                }
              }}
              value={renameValue}
            />
            {renameError && (
              <p className="mt-3 rounded-lg bg-[var(--miva-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--miva-danger-hover)]">{renameError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <SecondaryButton onClick={() => setRenameTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void confirmRename()}>Save name</PrimaryButton>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {deleteTarget && (
        <ModalBackdrop>
          <ModalPanel className="max-w-[460px] border-[var(--miva-danger-soft)] text-center">
            <i className="ph ph-trash mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[var(--miva-danger-soft)] text-[28px] text-[var(--miva-danger-hover)]" />
            <h3 className="mt-5 font-heading text-xl font-bold text-[var(--miva-text)]">Delete this assistant?</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">
              Deleting this assistant will permanently remove its settings and conversation history from this device.
            </p>
            <p className="mt-3 rounded-lg bg-[var(--miva-bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--miva-text)]">{deleteTarget.name}</p>
            <div className="mt-6 flex justify-center gap-3">
              <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton className="bg-[var(--miva-danger)] hover:bg-[var(--miva-danger-hover)]" onClick={() => void confirmDelete()}>
                Delete assistant
              </PrimaryButton>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </div>
  );
}
