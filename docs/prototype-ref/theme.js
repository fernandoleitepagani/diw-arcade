(function(){var r=document.documentElement,t;try{t=localStorage.getItem('diw-theme')}catch(e){}
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';r.setAttribute('data-theme',t);
document.addEventListener('click',function(e){var b=e.target.closest('[data-theme-toggle]');if(!b)return;
var n=r.getAttribute('data-theme')==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('diw-theme',n)}catch(e){}});})();
