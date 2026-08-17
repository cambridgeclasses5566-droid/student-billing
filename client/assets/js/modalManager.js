const sizes=new Set(['small','medium','large','wide','full']);
if(!document.querySelector('link[data-modal-stability]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/css/modal-stability.css';link.dataset.modalStability='true';document.head.append(link)}
let state=null;
const root=()=>{let node=document.getElementById('globalModalRoot');if(!node){node=document.createElement('div');node.id='globalModalRoot';document.body.append(node)}return node};
const host=()=>root().querySelector('.app-modal');
const unlockPage=()=>document.body.classList.remove('modal-open');
const lockPage=()=>document.body.classList.add('modal-open');
function cleanup({restoreFocus=true}={}){const previous=state;state=null;root().replaceChildren();unlockPage();if(restoreFocus)previous?.trigger?.focus?.();previous?.onClose?.()}
export function closeModal({force=false,restoreFocus=true}={}){if(!force&&state?.dirty&&!confirm('Discard unsaved changes?'))return false;cleanup({restoreFocus});return true}
export function destroyModal(){cleanup({restoreFocus:false})}
export function openModal({content='',size='medium',trigger=document.activeElement,onOpen,onClose,preventBackdropClose=false}={}){cleanup({restoreFocus:false});const safeSize=sizes.has(size)?size:'medium',backdrop=document.createElement('div');backdrop.className='app-modal-backdrop';backdrop.innerHTML=`<section class="app-modal app-modal--${safeSize}" role="dialog" aria-modal="true">${content}</section>`;root().append(backdrop);const dialog=backdrop.firstElementChild;state={trigger,onClose,preventBackdropClose,dirty:false};lockPage();backdrop.addEventListener('mousedown',event=>{if(event.target===backdrop&&!state?.preventBackdropClose)closeModal()});backdrop.addEventListener('click',event=>{const close=event.target.closest('[data-modal-close],[data-dialog-close],.modal-close');if(close){event.preventDefault();closeModal()}});queueMicrotask(()=>dialog.querySelector('[autofocus],input:not([type="hidden"]),select,textarea,button')?.focus());onOpen?.(dialog);return dialog}
export function replaceModalContent({content='',size='small',onOpen}={}){const dialog=host();if(!dialog)return openModal({content,size,onOpen});dialog.className=`app-modal app-modal--${sizes.has(size)?size:'small'}`;dialog.innerHTML=content;if(state)state.dirty=false;queueMicrotask(()=>dialog.querySelector('button,a,input')?.focus());onOpen?.(dialog);return dialog}
export function setModalDirty(value=true){if(state)state.dirty=value}
export function setModalLoading(loading,label='Please wait…'){const button=host()?.querySelector('[type="submit"]');if(!button)return;if(loading){button.dataset.originalLabel=button.innerHTML;button.disabled=true;button.textContent=label}else{button.disabled=false;button.innerHTML=button.dataset.originalLabel||button.innerHTML}}
export function showModalValidationError(message){const target=host()?.querySelector('.form-error-summary,[data-modal-error]');if(!target)return;target.hidden=false;target.textContent=message;target.focus?.()}
export function initializeModalManager(){root()}
initializeModalManager();
