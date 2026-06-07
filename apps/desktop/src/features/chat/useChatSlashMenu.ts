import { useCallback, useMemo, useState, type KeyboardEvent, type RefObject } from "react";
import {
  CHAT_SLASH_COMMANDS,
  filterSlashCommands,
  getSlashMenuQuery,
  parseSlashCommand,
  type ChatSlashCommand,
} from "./slashCommands";

type UseChatSlashMenuOptions = {
  chatInput: string;
  setChatInput: (value: string) => void;
  selectedSlashCommand: ChatSlashCommand | null;
  setSelectedSlashCommand: (command: ChatSlashCommand | null) => void;
  slashCommands?: ChatSlashCommand[];
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
};

export function useChatSlashMenu({
  chatInput,
  setChatInput,
  selectedSlashCommand,
  setSelectedSlashCommand,
  slashCommands = CHAT_SLASH_COMMANDS,
  inputRef,
  disabled = false,
}: UseChatSlashMenuOptions) {
  const [caretIndex, setCaretIndex] = useState(chatInput.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);

  const slashQuery = useMemo(() => {
    if (selectedSlashCommand) {
      return null;
    }

    return getSlashMenuQuery(chatInput, caretIndex);
  }, [caretIndex, chatInput, selectedSlashCommand]);
  const filteredCommands = useMemo(
    () => filterSlashCommands(slashQuery, slashCommands),
    [slashCommands, slashQuery],
  );
  const menuOpen = !disabled && !menuDismissed && slashQuery !== null && filteredCommands.length > 0;
  const activeCommand = filteredCommands[activeIndex] ?? filteredCommands[0] ?? null;

  const syncCaret = useCallback((element: HTMLTextAreaElement) => {
    setCaretIndex(element.selectionStart ?? element.value.length);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuDismissed(true);
  }, []);

  const openMenu = useCallback(() => {
    setMenuDismissed(false);
  }, []);

  const selectCommand = useCallback((command: ChatSlashCommand) => {
    setSelectedSlashCommand(command);
    setChatInput("");
    setMenuDismissed(true);
    setActiveIndex(0);

    requestAnimationFrame(() => {
      const element = inputRef?.current;
      if (!element) {
        return;
      }

      element.focus();
      element.setSelectionRange(0, 0);
    });
  }, [inputRef, setChatInput, setSelectedSlashCommand]);

  const clearSelectedCommand = useCallback(() => {
    setSelectedSlashCommand(null);
    setMenuDismissed(false);
  }, [setSelectedSlashCommand]);

  const handleInputChange = useCallback((value: string, element: HTMLTextAreaElement) => {
    if (!selectedSlashCommand) {
      const parsed = value.trim() ? parseSlashCommand(value, slashCommands) : null;
      if (parsed && value.trimStart().startsWith("/")) {
        setSelectedSlashCommand(parsed.command);
        setChatInput(parsed.prompt);
        syncCaret(element);
        setMenuDismissed(true);
        setActiveIndex(0);
        return;
      }
    }

    setChatInput(value);
    syncCaret(element);
    setMenuDismissed(false);
    setActiveIndex(0);
  }, [selectedSlashCommand, setChatInput, setSelectedSlashCommand, slashCommands, syncCaret]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Backspace" && !chatInput && selectedSlashCommand) {
      event.preventDefault();
      clearSelectedCommand();
      return true;
    }

    if (!menuOpen) {
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % filteredCommands.length);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + filteredCommands.length) % filteredCommands.length);
      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return true;
    }

    if (event.key === "Enter" && !event.shiftKey && activeCommand) {
      event.preventDefault();
      selectCommand(activeCommand);
      return true;
    }

    if (event.key === "Tab" && activeCommand) {
      event.preventDefault();
      selectCommand(activeCommand);
      return true;
    }

    return false;
  }, [
    activeCommand,
    chatInput,
    clearSelectedCommand,
    closeMenu,
    filteredCommands.length,
    menuOpen,
    selectCommand,
    selectedSlashCommand,
  ]);

  return {
    activeCommand,
    activeIndex,
    allCommands: slashCommands,
    caretIndex,
    clearSelectedCommand,
    filteredCommands,
    handleInputChange,
    handleKeyDown,
    menuOpen,
    openMenu,
    selectCommand,
    setActiveIndex,
    syncCaret,
    closeMenu,
  };
}
