
/* SafeMarg UI enhancements */
(function(){
  const $=id=>document.getElementById(id);
  document.addEventListener("DOMContentLoaded",()=>{
    // Keep the dark-mode button useful even if the main script is edited later.
    const b=$("darkToggle");
    if(b && !b.dataset.bound){
      b.dataset.bound="1";
      b.addEventListener("dblclick",()=>document.body.classList.remove("dark"));
    }
  });
})();
