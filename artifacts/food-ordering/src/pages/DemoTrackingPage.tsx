El.textContent = "🏍️";
      const riderMarker = new mapboxgl.Marker({ element: rEl, anchor: "center" })
        .setLngLat(pickup)
        .addTo(map);
      riderMarkerRef.current = riderMarker;

      const bounds = route.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(route[0] as [number,number], route[0] as [number,number])
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 1400 });
    });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const curStep = STEP_IDX[status];

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4"/>
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Track Order — Demo</h1>
            <p className="text-[10px] text-muted-foreground">Live simulation · Accra, Ghana</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-0.5 text-xs font-bold transition-all ${
            status === "delivered" ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
          }`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </header>

      {/* Toast notification */}
      <div className={`fixed top-16 left-1/2 z-[200] -translate-x-1/2 transition-all duration-500 ${showToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      </div>

      <div className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-4 pb-8">

        {/* Mapbox map */}
        <div className="relative w-full overflow-hidden rounded-3xl shadow-xl" style={{ height: 300 }}>
          {webGLError ? (
            /* Fallback when WebGL unavailable (e.g. headless preview) */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117] gap-3">
              <span className="text-6xl">🗺️</span>
              <p className="font-bold text-white text-center px-6">Live Mapbox map<br/>renders on your device</p>
              <p className="text-xs text-gray-400 text-center px-8">
                Streets of Accra · Rider tracking · Real route<br/>
                (WebGL required — works on all phones &amp; browsers)
              </p>
              <div className="flex gap-2 mt-1">
                <span className="rounded-full bg-green-500/20 border border-green-500/40 px-2.5 py-1 text-[11px] text-green-400">📍 Accra Mall</span>
                <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-1 text-[11px] text-red-400">📍 UG Legon</span>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="absolute inset-0"/>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-green-700">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/> Accra Mall
            </div>
            {status !== "pending" && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-white animate-pulse">
                🏍️ Rider en route
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow text-xs font-semibold text-red-600">
              <div className="h-2 w-2 rounded-full bg-red-500"/> UG Legon
            </div>
          </div>
        </div>

        {/* ETA bar */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Clock className="h-5 w-5 text-primary shrink-0"/>
          <div>
            <p className="text-xs text-muted-foreground">Estimated arrival</p>
            <p className="font-bold text-foreground">
              {status === "pending" ? "Matching rider…" : status === "confirmed" ? "~20 min" : status === "preparing" ? "~15 min" : status === "delivering" ? "~8 min" : "Arrived ✓"}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Demo order</p>
            <p className="font-bold text-primary">GH₵45.00</p>
          </div>
        </div>

        {/* Status stepper */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-1">
            {STEPS.map((step, i) => {
              const done = curStep > i;
              const active = curStep === i;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all duration-500 ${done ? "bg-primary" : active ? "bg-primary animate-pulse" : "bg-muted"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4 text-white"/> : <span>{step.icon}</span>}
                  </div>
                  <p className={`text-center text-[9px] font-semibold leading-tight transition-colors ${active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Searching animation */}
        {status === "pending" && (
          <div className="rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col items-center">
            <div className="relative mb-5">
              <div className="h-24 w-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
                <span className="text-4xl">🏍️</span>
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping"/>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary"/>
            </div>
            <h3 className="font-bold text-xl text-foreground">Finding your rider…</h3>
            <p className="text-sm text-muted-foreground mt-1">Matching you with a nearby rider</p>
            <div className="mt-4 flex gap-1.5">
              {[0,1,2].map(i=><div key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{animationDelay:`${i*0.2}s`}}/>)}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5"/>
              <div><p className="text-[11px] text-muted-foreground">Pickup</p><p className="font-medium text-foreground">Accra Mall, Spintex Road</p></div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-border h-3"/>
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5"/>
              <div><p className="text-[11px] text-muted-foreground">Delivery</p><p className="font-medium text-foreground">University of Ghana, Legon</p></div>
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-1.5 text-sm">
            {[["After Lectures Bowl", "GH₵25.00"], ["Delivery fee", "GH₵10.00"], ["Platform fee", "GH₵2.00"]].map(([k,v])=>(
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-border pt-1.5">
              <span>Total</span><span className="text-primary">GH₵45.00</span>
            </div>
          </div>
        </div>

        {/* Rider card */}
        {status !== "pending" && (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">🧑‍💼</div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Kofi Mensah</p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s=><Star key={s} className="h-3 w-3 text-yellow-400 fill-yellow-400"/>)}
                <span className="ml-1 text-xs text-muted-foreground">4.9 · 823 trips</span>
              </div>
            </div>
            <a href="tel:+233000000000"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
              <Phone className="h-5 w-5"/>
            </a>
          </div>
        )}

        {/* Delivered state */}
        {status === "delivered" && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-green-700 text-lg">Order Delivered!</p>
            <p className="text-sm text-green-600 mt-1">Paystack payment request sent to your phone</p>
            <Button className="mt-4 w-full rounded-2xl bg-primary text-white font-bold py-5">
              Pay Now — GH₵45.00
            </Button>
          </div>
        )}

        {/* Demo controls */}
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Demo Controls</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_SEQUENCE.map((s, i) => (
              <button key={s} onClick={() => { setStatusIdx(i); showMsg(STATUS_TOASTS[s]); }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${statusIdx === i ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary/40"}`}>
                {STATUS_LABELS[s].replace(/[🎉✅🏍️🚀]/g,"").trim() || s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Auto-advances every few seconds · Click any status to jump</p>
        </div>

      </div>
    </div>
  );
};

export default DemoTrackingPage;
