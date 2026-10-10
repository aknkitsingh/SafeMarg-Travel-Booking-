
(function(){
  const $=id=>document.getElementById(id);
  let mode="flight", selectedTrip=null, selectedSeat=null, payMethod="card";
  const cityData = [
    ["New Delhi","DEL","NDLS"],["Mumbai","BOM","BCT"],["Chandigarh","IXC","CDG"],
    ["Amritsar","ATQ","ASR"],["Ludhiana","LUH","LDH"],["Jalandhar","JUC","JUC"],
    ["Jaipur","JAI","JP"],["Agra","AGR","AGC"],["Lucknow","LKO","LKO"],
    ["Kanpur","KNU","CNB"],["Varanasi","VNS","BSB"],["Patna","PAT","PNBE"],
    ["Kolkata","CCU","HWH"],["Ahmedabad","AMD","ADI"],["Surat","STV","ST"],
    ["Pune","PNQ","PUNE"],["Bhopal","BHO","BPL"],["Indore","IDR","INDB"],
    ["Hyderabad","HYD","SC"],["Bengaluru","BLR","SBC"],["Chennai","MAA","MAS"],
    ["Goa","GOI","MAO"],["Kochi","COK","ERS"],["Dehradun","DED","DDN"],
    ["Haridwar","HWR","HW"],["Rishikesh","RIS","RKSH"],["Jammu","IXJ","JAT"],
    ["Srinagar","SXR","SINA"],["Udaipur","UDR","UDZ"],["Manali","KUU","—"],
    ["Ranchi","IXR","RNC"],["Guwahati","GAU","GHY"]
  ];

  const internationalCities = [
    ["Dubai","DXB"],["Singapore","SIN"],["London","LHR"],["Paris","CDG"],
    ["Bangkok","BKK"],["Kuala Lumpur","KUL"],["Doha","DOH"],["Abu Dhabi","AUH"],
    ["New York","JFK"],["Toronto","YYZ"],["Sydney","SYD"],["Maldives","MLE"]
  ];

  const trips={
    flight:[
      ["IndiGo","06:10","08:15","₹4,120",94],
      ["Air India","09:25","11:40","₹4,680",91],
      ["Vistara","18:20","20:30","₹5,120",96],
      ["Akasa Air","21:05","23:15","₹3,890",93]
    ],
    train:[
      ["Rajdhani Express","16:55","08:35","₹2,140",95],
      ["Duronto Express","22:10","10:30","₹1,860",92],
      ["Shatabdi Express","06:00","12:25","₹1,740",94],
      ["Vande Bharat","15:30","21:10","₹1,980",97]
    ],
    bus:[
      ["Volvo Multi-Axle","20:30","07:15","₹1,650",90],
      ["AC Sleeper","21:15","08:10","₹1,420",87],
      ["Premium Sleeper","22:00","09:00","₹1,890",93],
      ["Scania AC Seater","19:45","06:30","₹1,280",91]
    ]
  };

  const cities={
    flight:cityData.map(c=>`${c[0]} (${c[1]})`),
    train:cityData.map(c=>`${c[0]} (${c[2]})`),
    bus:cityData.map(c=>c[0])
  };

  function fillCities(){
    const from=$("fromCity"),to=$("toCity");
    if(!from||!to)return;
    from.innerHTML="";to.innerHTML="";
    const international=$("intlCheck")?.checked;
    const list=international ? internationalCities : cityData;
    list.forEach((c)=>{
      const code=international?c[1]:(mode==="flight"?c[1]:mode==="train"?c[2]:c[1]);
      const label=c[0]+" ("+code+")";
      from.add(new Option(label,code));
      to.add(new Option(label,code));
    });
    if(list.length>1) to.selectedIndex=1;
  }

  window.setMode=function(m){
    mode=m;
    document.querySelectorAll(".mode-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===m));
    const icon=$("modeIconTop");
    if(icon){
      const p=m==="flight"
        ? 'M2 16.5L22 12L2 7.5L2 11L14 12L2 13V16.5Z'
        : m==="train" ? 'M5 3h14v14H5z' : 'M3 5h18v12H3z';
      icon.querySelector("path").setAttribute("d",p);
    }
    fillCities();
    if($("routeLabel")) $("routeLabel").innerHTML=(m==="flight"?"DEL ✈ BOM":m==="train"?"DEL ▣ BOM":"DEL ▰ BOM");
  };

  window.doSearch=function(){
    const from=$("fromCity").value.split(" ")[0]||"DEL";
    const to=$("toCity").value.split(" ")[0]||"BOM";
    if(from===to){showToast("Choose different From and To cities");return}
    $("resultsTitle").textContent=`Trips, ${from} → ${to}`;
    const list=$("flightList");list.innerHTML="";
    trips[mode].forEach((t,i)=>{
      const card=document.createElement("div");
      card.className="trip-card";
      card.innerHTML=`
        <div class="trip-main">
          <div><div class="trip-air">${t[0]}</div><div class="trip-route">${mode.toUpperCase()}</div></div>
          <div><span class="trip-time">${t[1]}</span> — <span class="trip-time">${t[2]}</span><div class="trip-route">${from} → ${to}</div></div>
          <div><span class="score">Safety ${t[4]}</span><div class="trip-route" style="margin-top:7px">Verified safety rating</div></div>
        </div>
        <div class="trip-price"><strong>${t[3]}</strong><small>per adult</small><br><button class="select-trip">Select</button></div>`;
      card.querySelector(".select-trip").onclick=()=>chooseTrip(t,i,from,to);
      list.appendChild(card);
    });
    goStep("results");
  };

  function chooseTrip(t,i,from,to){
    selectedTrip={name:t[0],fare:parseInt(t[3].replace(/[₹,]/g,"")),score:t[4],depart:t[1],from,to};
    $("sumRoute").textContent=`${from} → ${to}`;
    $("sumFare").textContent=money(selectedTrip.fare);
    $("sumTotal").textContent=money(selectedTrip.fare);
    $("seatsHeading").textContent=`Choose your seat · ${t[0]}`;
    buildSeats();
    goStep("seats");
  }

  function buildSeats(){
    const g=$("seatGrid");g.innerHTML="";selectedSeat=null;
    $("sumSeat").textContent="Not selected";$("sumSeatCharge").textContent="₹0";
    $("seatContinue").disabled=true;
    for(let r=1;r<=8;r++){
      for(let c=1;c<=4;c++){
        const n=`${r}${String.fromCharCode(65+c-1)}`;
        const b=document.createElement("button");b.className="seat";b.textContent=n;
        if((r+c)%5===0)b.classList.add("taken");
        if(r<=2)b.classList.add("premium");
        if(!b.classList.contains("taken")){
          b.onclick=()=>selectSeat(b,n,r<=2);
        }
        g.appendChild(b);
      }
      const spacer=document.createElement("div");spacer.style.gridColumn="1/-1";spacer.style.height="2px";g.appendChild(spacer);
    }
  }
  function selectSeat(btn,n,premium){
    document.querySelectorAll(".seat.selected").forEach(x=>x.classList.remove("selected"));
    btn.classList.add("selected");selectedSeat={n,premium};
    const charge=premium?500:0;
    $("sumSeat").textContent=n;$("sumSeatCharge").textContent=money(charge);
    $("sumTotal").textContent=money(selectedTrip.fare+charge);
    $("seatContinue").disabled=false;
    $("paySumSeat").textContent=n;$("paySumFare").textContent=money(selectedTrip.fare);
    $("paySumTotal").textContent=money(selectedTrip.fare+412+charge);
  }

  window.goStep=function(step){
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    const v=$("view-"+step);if(v)v.classList.add("active");
    document.querySelectorAll(".step").forEach(s=>{
      s.classList.toggle("active",s.dataset.step===step);
      const order=["search","results","seats","pay","confirm"];
      s.classList.toggle("done",order.indexOf(s.dataset.step)<order.indexOf(step));
    });
    window.scrollTo({top:0,behavior:"smooth"});
  };

  window.setPayMethod=function(m){
    payMethod=m;
    $("tabCard").classList.toggle("active",m==="card");
    $("tabUpi").classList.toggle("active",m==="upi");
    $("cardMethod").style.display=m==="card"?"block":"none";
    $("upiMethod").style.display=m==="upi"?"block":"none";
    if(m==="upi" && window.QRCode && !$("upiQr").hasChildNodes()) new QRCode($("upiQr"),{text:"upi://pay?pa=safemarg@upi&pn=SafeMarg&am=1",width:120,height:120});
  };

  function validatePayment(){
    const name=$("paxName").value.trim(),phone=$("paxPhone").value.trim(),email=$("paxEmail").value.trim();
    if(!name||!/^[A-Za-z .'-]+$/.test(name)){showToast("Enter a valid name");return false}
    if(!/^[6-9]\d{9}$/.test(phone)){showToast("Enter a 10-digit mobile number");return false}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showToast("Enter a valid email");return false}
    return true;
  }
  window.doPayment=function(){
    if(!validatePayment())return;
    if(!/^\d{16,19}$/.test($("cardNum").value.replace(/\s/g,""))){showToast("Enter a 16-digit card number");return}
    if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test($("cardExp").value)){showToast("Enter expiry as MM/YY");return}
    if(!/^\d{3}$/.test($("cardCvv").value)){showToast("Enter a 3-digit CVV");return}
    confirmBooking();
  };
  window.doPaymentUpi=function(){
    if(!validatePayment())return;
    if(!$("upiId").value.trim()){showToast("Enter your UPI ID");return}
    confirmBooking();
  };

  function confirmBooking(){
    $("etName").textContent=$("paxName").value.trim();
    $("etNameStub").textContent=$("paxName").value.trim();
    $("etRoute").textContent=`${selectedTrip.from} → ${selectedTrip.to}`;
    $("etRouteStub").textContent=`${selectedTrip.from} → ${selectedTrip.to}`;
    $("etSeat").textContent=selectedSeat.n;$("etSeatStub").textContent=selectedSeat.n;
    $("etDepart").textContent=$("departDate").value;
    $("etFare").textContent=money(selectedTrip.fare);
    $("etSeatCharge").textContent=money(selectedSeat.premium?500:0);
    $("etAmount").textContent=$("paySumTotal").textContent;
    $("scoreOut").textContent=selectedTrip.score;
    $("etModeOut").textContent=mode.toUpperCase();
    const pnr="SM"+Math.random().toString(36).slice(2,8).toUpperCase();
    $("pnrOut").textContent=pnr;$("etPnrStub").textContent=pnr;$("etBarcodeNum").textContent=pnr+"000";
    if(window.QRCode){
      $("etQr").innerHTML="";
      new QRCode($("etQr"),{text:`SafeMarg|${pnr}|${selectedSeat.n}`,width:120,height:120});
    }
    const bars=$("etBarcode");bars.innerHTML="";
    for(let i=0;i<55;i++){const s=document.createElement("span");s.style.display="inline-block";s.style.height="34px";s.style.width=(i%3===0?3:1)+"px";s.style.background="#fff";s.style.marginRight=(i%4===0?2:1)+"px";bars.appendChild(s)}
    goStep("confirm");
  }

  window.applyPromo=function(){
    const code=$("promoInput").value.trim().toUpperCase();
    let discount=0;
    const base=selectedTrip?selectedTrip.fare+(selectedSeat?.premium?500:0):0;
    if(code==="SAFE10")discount=Math.round(base*.10);
    else if(code==="FLAT100")discount=100;
    else { $("promoMsg").textContent="Invalid promo code";$("promoMsg").style.color="var(--red)";return}
    $("discountRow").style.display="flex";$("paySumDiscount").textContent="-"+money(discount);
    $("promoMsg").textContent="Promo applied successfully";$("promoMsg").style.color="var(--green)";
    $("paySumTotal").textContent=money(Math.max(0,base+412-discount));
  };

  function money(n){return "₹"+Number(n||0).toLocaleString("en-IN")}
  function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
  window.openLogin=function(){$("loginOverlay").classList.add("open")}
  window.closeLogin=function(){$("loginOverlay").classList.remove("open")}
  window.doLogin=function(){
    const n=$("loginName").value.trim();
    if(!n){showToast("Enter your name");return}
    $("loginBtnLabel").textContent=n.split(" ")[0];closeLogin();showToast("Demo login successful");
  }
  window.closeDetails=function(){$("detailsOverlay").classList.remove("open")}
  window.formatCard=function(el){let v=el.value.replace(/\D/g,"").slice(0,16);el.value=v.replace(/(.{4})/g,"$1 ").trim();$("cardPreview").textContent=(el.value||"•••• •••• •••• ••••").padEnd(19,"•")}
  window.formatExp=function(el){let v=el.value.replace(/\D/g,"").slice(0,4);if(v.length>2)v=v.slice(0,2)+"/"+v.slice(2);el.value=v;$("expPreview").textContent=v||"MM/YY"}
  window.resetAll=function(){selectedTrip=null;selectedSeat=null;goStep("search")}
  window.toggleIntl=function(){fillCities();showToast($("intlCheck").checked?"12 international destinations loaded 🌍":"32 domestic destinations loaded 🇮🇳")}
  window.showDetails=function(){}

  document.addEventListener("DOMContentLoaded",()=>{
    fillCities();
    const d=new Date();d.setDate(d.getDate()+1);
    if($("departDate"))$("departDate").value=d.toISOString().slice(0,10);
    if($("darkToggle"))$("darkToggle").onclick=()=>document.body.classList.toggle("dark");
    $("paxName")?.addEventListener("input",e=>$("namePreview").textContent=e.target.value.toUpperCase()||"CARDHOLDER NAME");
    // Extra frontend-only controls: swap cities, quick city search, journey countdown and route card.
    const fromField=$("fromCity"), toField=$("toCity");
    if(fromField && toField && !document.getElementById("swapCities")){
      const swap=document.createElement("button");
      swap.id="swapCities"; swap.type="button"; swap.className="sm-swap";
      swap.textContent="↔ Swap";
      swap.title="Swap departure and destination";
      swap.onclick=()=>{const i=fromField.selectedIndex;fromField.selectedIndex=toField.selectedIndex;toField.selectedIndex=i; showToast("Route swapped ↔");};
      const row=fromField.closest(".field-row"); if(row) row.appendChild(swap);
    }
    if($("view-results") && !document.getElementById("routeInfo")){
      const info=document.createElement("div"); info.id="routeInfo"; info.className="sm-route-info";
      info.innerHTML='<span>🛡️ Safety checked</span><span>💺 Seats available</span><span>🔒 Secure demo booking</span>';
      $("flightList").parentNode.insertBefore(info,$("flightList"));
    }
    window.addEventListener("pageshow",()=>{ if(document.body.classList.contains("dark")) document.documentElement.style.colorScheme="dark"; });
    const dark=$("darkToggle");
    if(dark) dark.addEventListener("click",()=>{document.documentElement.style.colorScheme=document.body.classList.contains("dark")?"dark":"light";});

  });
})();
