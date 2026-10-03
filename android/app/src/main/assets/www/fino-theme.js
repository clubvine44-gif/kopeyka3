(function(root){
  'use strict';
  var KEY='fino_theme_v1',values=['dark','light','system'];
  function choice(){try{var x=localStorage.getItem(KEY);return values.indexOf(x)>=0?x:'dark';}catch(err){return 'dark';}}
  function apply(){
    var selected=choice(),light=selected==='light'||selected==='system'&&root.matchMedia&&root.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.setAttribute('data-fino-theme',light?'light':'dark');
    var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',light?'#f5f7f5':'#101719');
    return selected;
  }
  function set(value){if(values.indexOf(value)<0)throw Error('Invalid theme');try{localStorage.setItem(KEY,value);}catch(err){}apply();return value;}
  if(root.matchMedia){var media=root.matchMedia('(prefers-color-scheme: light)');if(media.addEventListener)media.addEventListener('change',apply);}
  root.FinoTheme={get:choice,set:set,apply:apply};apply();
})(typeof window!=='undefined'?window:this);
