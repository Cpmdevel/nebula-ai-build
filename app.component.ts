
import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ProjectFile, FileVersion } from './services/gemini.service';
import { AuthService } from './services/auth.service';
import { PreviewFrameComponent } from './components/preview-frame.component';
import { AuthModalComponent } from './components/auth-modal.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, PreviewFrameComponent, AuthModalComponent],
  templateUrl: './app.component.html',
  styleUrls: [],
  host: {
    '(window:scroll)': 'onWindowScroll()',
    '(window:beforeunload)': 'onBeforeUnload($event)'
  }
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private sanitizer = inject(DomSanitizer);
  public authService = inject(AuthService); // Public for template access

  // Signals
  prompt = signal<string>('');
  isLoading = signal<boolean>(false);
  isEnhancing = signal<boolean>(false);
  showAuthModal = signal<boolean>(false);
  
  // Project State
  files = signal<ProjectFile[]>([]);
  selectedFile = signal<ProjectFile | null>(null);
  activeTab = signal<'preview' | 'code'>('preview');
  userImage = signal<string | null>(null);
  
  // Editor State
  isEditing = signal<boolean>(false);
  editingContent = signal<string>('');
  showUnsavedModal = signal<boolean>(false);
  showHistoryPanel = signal<boolean>(false);
  pendingAction = signal<(() => void) | null>(null);
  
  // Computed
  htmlCode = computed(() => {
    const htmlFile = this.files().find(f => f.filename === 'index.html');
    return htmlFile ? htmlFile.content : '';
  });

  highlightedCode = computed(() => {
    const file = this.selectedFile();
    if (!file) return '';
    // If editing, we show raw text in textarea, so this computed is only for 'view' mode
    // We use the file's committed content here
    return this.highlightSyntax(file.content, file.language);
  });

  // Parallax Scroll State
  scrollY = signal<number>(0);
  parallaxTransform = computed(() => `translate3d(0, ${this.scrollY() * -0.15}px, 0)`);

  // Pre-defined examples
  examples = [
    "Modern e-commerce store for sustainable fashion with a product grid, filters, and a shopping cart preview.",
    "Clean, minimalist travel blog featuring a masonry grid layout for articles and a newsletter signup.",
    "Professional corporate landing page for a legal consulting firm with a 'Meet the Team' section and trust badges.",
    "Futuristic SaaS dashboard for analytics with a dark mode sidebar, data charts, and activity feed."
  ];

  onWindowScroll() {
    this.scrollY.set(window.scrollY);
  }

  onBeforeUnload(event: Event) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      // @ts-ignore
      event.returnValue = '';
    }
  }

  openAuthModal() {
    this.showAuthModal.set(true);
  }

  closeAuthModal() {
    this.showAuthModal.set(false);
  }

  logout() {
    this.authService.logout();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.userImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.userImage.set(null);
  }

  async enhancePrompt() {
    this.isEnhancing.set(true);
    try {
      const improved = await this.geminiService.enhancePrompt(this.prompt());
      this.prompt.set(improved);
    } catch (error) {
      console.error('Failed to enhance prompt', error);
    } finally {
      this.isEnhancing.set(false);
    }
  }

  // Protected Generation Call
  tryGenerateWebsite() {
    if (this.hasUnsavedChanges()) {
      this.pendingAction.set(() => this.generateWebsite());
      this.showUnsavedModal.set(true);
    } else {
      this.generateWebsite();
    }
  }

  async generateWebsite() {
    if (!this.prompt().trim()) return;

    this.isLoading.set(true);
    this.files.set([]); 
    this.selectedFile.set(null);
    this.isEditing.set(false);
    this.editingContent.set('');
    this.showHistoryPanel.set(false);

    try {
      const hasImage = !!this.userImage();
      let projectFiles = await this.geminiService.generateProject(this.prompt(), hasImage);
      
      // Post-process HTML to inject custom image
      if (hasImage && this.userImage()) {
        projectFiles = projectFiles.map(file => {
          if (file.filename === 'index.html') {
            return {
              ...file,
              content: file.content.replace(/{{CUSTOM_IMAGE_PLACEHOLDER}}/g, this.userImage()!)
            };
          }
          return file;
        });
      }

      this.files.set(projectFiles);
      
      // Set default selection
      const indexHtml = projectFiles.find(f => f.filename === 'index.html');
      this.selectedFile.set(indexHtml || projectFiles[0]);
      
      this.activeTab.set('preview');
    } catch (error) {
      console.error('Failed to generate', error);
      alert('Something went wrong while generating your project. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  useExample(example: string) {
    this.prompt.set(example);
  }

  // Navigation Logic with Unsaved Changes Protection
  trySelectFile(file: ProjectFile) {
    if (this.selectedFile() === file) return;
    
    if (this.hasUnsavedChanges()) {
      this.pendingAction.set(() => this.selectFile(file));
      this.showUnsavedModal.set(true);
    } else {
      this.selectFile(file);
    }
  }

  trySwitchTab(tab: 'preview' | 'code') {
    if (this.activeTab() === tab) return;
    
    if (this.hasUnsavedChanges()) {
      this.pendingAction.set(() => this.activeTab.set(tab));
      this.showUnsavedModal.set(true);
    } else {
      this.activeTab.set(tab);
    }
  }

  tryCancelEdit() {
    if (this.hasUnsavedChanges()) {
      this.pendingAction.set(() => {
        this.isEditing.set(false);
        // Reset editing content to match saved content
        if (this.selectedFile()) {
           this.editingContent.set(this.selectedFile()!.content);
        }
      });
      this.showUnsavedModal.set(true);
    } else {
      this.isEditing.set(false);
    }
  }

  selectFile(file: ProjectFile) {
    this.selectedFile.set(file);
    this.activeTab.set('code');
    this.isEditing.set(false); 
    this.showHistoryPanel.set(false);
  }

  toggleEditMode() {
    if (this.isEditing()) {
      // User clicked "Done" -> Save changes
      this.saveChanges();
      this.isEditing.set(false);
    } else {
      // User clicked "Edit" -> Enter edit mode
      const file = this.selectedFile();
      if (file) {
        this.editingContent.set(file.content);
        this.isEditing.set(true);
      }
    }
  }

  toggleHistory() {
    this.showHistoryPanel.update(v => !v);
  }

  saveChanges() {
    const currentFile = this.selectedFile();
    if (!currentFile) return;

    const newContent = this.editingContent();

    // Don't save if no changes, but toggle off edit mode is fine
    if (newContent === currentFile.content) return;

    // 1. Create History Entry from OLD content
    const historyEntry: FileVersion = {
      timestamp: Date.now(),
      content: currentFile.content,
      label: `Saved Version`
    };

    const newHistory = [historyEntry, ...(currentFile.history || [])];

    // 2. Update the array of files
    this.files.update(prevFiles => 
      prevFiles.map(f => 
        f.filename === currentFile.filename ? { ...f, content: newContent, history: newHistory } : f
      )
    );

    // 3. Update the currently selected file object reference
    this.selectedFile.set({
      ...currentFile,
      content: newContent,
      history: newHistory
    });
  }

  restoreVersion(version: FileVersion) {
    const currentFile = this.selectedFile();
    if (!currentFile) return;

    // 1. Save CURRENT state to history before reverting (so we can redo)
    const backupEntry: FileVersion = {
      timestamp: Date.now(),
      content: currentFile.content,
      label: 'Auto-backup before Revert'
    };
    const newHistory = [backupEntry, ...(currentFile.history || [])];

    // 2. Restore content
    const restoredContent = version.content;

    // 3. Update Files
    this.files.update(prevFiles => 
      prevFiles.map(f => 
        f.filename === currentFile.filename ? { ...f, content: restoredContent, history: newHistory } : f
      )
    );

    // 4. Update Selection
    this.selectedFile.set({
      ...currentFile,
      content: restoredContent,
      history: newHistory
    });

    // 5. If in edit mode, update the editor buffer
    if (this.isEditing()) {
      this.editingContent.set(restoredContent);
    }

    // Close history panel
    this.showHistoryPanel.set(false);
  }

  // Unsaved Changes Modal Handlers
  hasUnsavedChanges(): boolean {
    return this.isEditing() && this.editingContent() !== this.selectedFile()?.content;
  }

  confirmSave() {
    this.saveChanges();
    this.isEditing.set(false);
    this.showUnsavedModal.set(false);
    this.pendingAction()?.();
    this.pendingAction.set(null);
  }

  confirmDiscard() {
    this.isEditing.set(false); // Exit edit mode without saving buffer
    this.showUnsavedModal.set(false);
    this.pendingAction()?.();
    this.pendingAction.set(null);
  }

  cancelNavigation() {
    this.showUnsavedModal.set(false);
    this.pendingAction.set(null);
  }

  downloadProject() {
    const file = this.selectedFile();
    if (!file) return;

    const content = this.isEditing() ? this.editingContent() : file.content;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private highlightSyntax(code: string, language: string): SafeHtml {
    // 1. Escape HTML to prevent XSS and rendering issues
    let text = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const placeholders: string[] = [];
    const addPlaceholder = (content: string) => {
      placeholders.push(content);
      return `___PH_${placeholders.length - 1}___`;
    };

    // 2. Extract Strings (order matters to avoid matching keywords inside them)
    // Generic Strings ("" or '')
    text = text.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, match => 
      addPlaceholder(`<span class="token-string">${match}</span>`)
    );

    if (language === 'html') {
      // HTML Comments
      text = text.replace(/(&lt;!--[\s\S]*?--&gt;)/g, match => 
        addPlaceholder(`<span class="token-comment">${match}</span>`)
      );
      // HTML Tags (open/close)
      text = text.replace(/(&lt;\/?)([a-zA-Z0-9-]+)(.*?)(\/?&gt;)/g, (match, p1, p2, p3, p4) => {
        let tag = `<span class="token-tag">${p2}</span>`;
        let attrs = p3.replace(/\s([a-zA-Z0-9-]+)=/g, ' <span class="token-attr">$1</span>=');
        return `${p1}${tag}${attrs}${p4}`;
      });
    } else if (language === 'css') {
      // CSS Comments
      text = text.replace(/(\/\*[\s\S]*?\*\/)/g, match => 
        addPlaceholder(`<span class="token-comment">${match}</span>`)
      );
      // CSS Properties (word followed by :)
      text = text.replace(/([a-zA-Z-]+):/g, '<span class="token-property">$1</span>:');
    } else {
      // JS/Java/JSON/Python Comments
      text = text.replace(/(\/\*[\s\S]*?\*\/)/g, match => 
        addPlaceholder(`<span class="token-comment">${match}</span>`)
      );
      text = text.replace(/(\/\/.*$)/gm, match => 
        addPlaceholder(`<span class="token-comment">${match}</span>`)
      );
      if (language === 'python') {
        text = text.replace(/(#.*$)/gm, match => 
          addPlaceholder(`<span class="token-comment">${match}</span>`)
        );
      }
    }

    // 3. Language Specific Keywords
    const keywordsMap: Record<string, string[]> = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from', 'export', 'default', 'class', 'extends', 'new', 'this', 'async', 'await', 'try', 'catch', 'case', 'switch'],
      typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from', 'export', 'default', 'class', 'extends', 'new', 'this', 'async', 'await', 'try', 'catch', 'interface', 'type', 'implements', 'public', 'private', 'protected', 'readonly', 'declare', 'module', 'namespace'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'void', 'int', 'boolean', 'String', 'return', 'if', 'else', 'for', 'while', 'new', 'this', 'static', 'final', 'package', 'import', 'try', 'catch', 'throw', 'throws'],
      python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'try', 'except', 'print', 'None', 'True', 'False', 'pass', 'break', 'continue', 'with', 'as', 'global', 'lambda'],
      json: ['true', 'false', 'null']
    };

    const langKey = (language === 'html' || language === 'css') ? null : (keywordsMap[language] ? language : 'javascript'); // Default to JS for unknown
    
    if (langKey) {
       const kws = keywordsMap[langKey];
       // Sort by length desc to match longer keywords first (though \b handles most issues)
       const pattern = new RegExp(`\\b(${kws.join('|')})\\b`, 'g');
       text = text.replace(pattern, '<span class="token-keyword">$1</span>');

       // Numbers
       text = text.replace(/\b\d+\b/g, '<span class="token-number">$&</span>');
       
       // Functions (word followed by ()
       text = text.replace(/\b([a-zA-Z0-9_]+)\(/g, '<span class="token-function">$1</span>(');
    }

    // 4. Restore Placeholders
    placeholders.forEach((phContent, index) => {
      const ph = `___PH_${index}___`;
      text = text.split(ph).join(phContent);
    });

    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}
