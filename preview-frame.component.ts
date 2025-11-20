import { Component, Input, OnChanges, SimpleChanges, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-preview-frame',
  standalone: true,
  template: `
    <div class="w-full h-full rounded-xl overflow-hidden bg-white border border-white/10 relative group">
       @if (safeSrc) {
        <iframe 
          [srcdoc]="safeSrc" 
          class="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Preview"
        ></iframe>
       } @else {
         <div class="w-full h-full flex items-center justify-center text-slate-400 bg-black/40">
           <p>Waiting for code generation...</p>
         </div>
       }
    </div>
  `
})
export class PreviewFrameComponent implements OnChanges {
  @Input() htmlCode: string = '';
  safeSrc: string | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['htmlCode'] && this.htmlCode) {
       // In a real app, we would sanitize strictly. 
       // For this demo, we trust the AI output enough to render in a sandboxed iframe.
       this.safeSrc = this.htmlCode;
    }
  }
}