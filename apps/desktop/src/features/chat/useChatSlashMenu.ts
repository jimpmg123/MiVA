import { useCallback, useMemo, useState, type KeyboardEvent, type RefObject } from "react";
import {
  buildSlashCommandInput,
  CHAT_SLASH_COMMANDS,
  filterSlashCommands,
  getSlashMenuQuery,
  type ChatSlashCommand,
} from "./slashCommands";

type UseChatSlashMenuOptions = {
  chatInput: string;
  setChatInput: (value: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
};

export function useChatSlashMenu({
  chatInput,
  setChatInput,
  inputRef,
  disabled = false,
}: UseChatSlashMenuOptions) {
  const [caretIndex, setCaretIndex] = useState(chatInput.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);

  const slashQuery = useMemo(() => getSlashMenuQuery(chatInput, caretIndex), [caretIndex, chatInput]);
  const filteredCommands = useMemo(() => filterSlashCommands(slashQuery), [slashQuery]);
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
    setChatInput(buildSlashCommandInput(command));
    setMenuDismissed(true);
    setActiveIndex(0);

    requestAnimationFrame(() => {
      const element = inputRef?.current;
      if (!element) {
        return;
      }

      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    });
  }, [inputRef, setChatInput]);

  const handleInputChange = useCallback((value: string, element: HTMLTextAreaElement) => {
    setChatInput(value);
    syncCaret(element);
    setMenuDismissed(false);
    setActiveIndex(0);
  }, [setChatInput, syncCaret]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [activeCommand, closeMenu, filteredCommands.length, menuOpen, selectCommand]);

  return {
    activeCommand,
    activeIndex,
    allCommands: CHAT_SLASH_COMMANDS,
    caretIndex,
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
