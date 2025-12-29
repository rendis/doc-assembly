declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setImage: (options: { src: string; alt?: string; title?: string; width?: string | number; height?: string | number }) => ReturnType;
  }
}
