window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.login = {
  render: function () {
    const auth = window.NovelCastAuth;
    const user = auth ? auth.getUser() : null;

    if (user) {
      return `
        <!-- Authenticated State Card -->
        <div class="min-h-screen flex items-center justify-center px-4 py-12 relative z-10 bg-obsidian-950 text-ivory-100">
          <div class="w-full max-w-[440px] sanctuary-glass rounded-2xl p-8 md:p-10 text-center relative overflow-hidden shadow-2xl border border-gold-400/25">
            <div class="flex justify-center mb-4">
              <img src="logo.svg" alt="NovelCast Logo" class="h-12 w-auto object-contain filter drop-shadow-[0_2px_14px_rgba(242,212,121,0.4)]" />
            </div>

            <p class="text-[9px] uppercase tracking-luxury text-gold-400/80 font-medium mb-1">Sanctuary Credentials</p>
            <h2 class="font-editorial-serif text-3xl text-ivory-50 font-normal tracking-wide">Patron Active</h2>
            <p class="text-xs text-ivory-400 font-light mt-1.5">You are currently signed into the private atelier as</p>
            
            <div class="mt-4 px-4 py-2.5 rounded-xl bg-obsidian-950/70 border border-gold-400/20 text-gold-300 text-xs font-mono break-all">
              ${window.NovelCast.escapeHtml(user.email || 'Sanctuary Member')}
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8">
              <a href="#/library" class="w-full sm:w-auto px-6 py-2.5 rounded-xl gold-cta-btn text-obsidian-950 text-xs font-semibold tracking-luxury uppercase shadow-lg flex items-center justify-center gap-2">
                <span>Enter Library</span>
                <span>→</span>
              </a>
              <button id="btn-auth-signout" class="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-gold-400/20 hover:border-red-400/60 hover:text-red-300 text-ivory-300 text-xs tracking-wider transition-all flex items-center justify-center cursor-pointer">
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-obsidian-950 text-ivory-100 font-sans antialiased min-h-screen flex flex-col justify-between selection:bg-gold-500/30 selection:text-gold-200 overflow-x-hidden relative">
        
        <!-- BEGIN: AtmosphericBackground (High luminosity manuscript & warm atelier bokeh) -->
        <div aria-hidden="true" class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <img 
            alt="Atmospheric antique literary atelier library illuminated manuscript" 
            class="w-full h-full object-cover object-center scale-100 filter brightness-105 contrast-105 saturate-110" 
            src="assets/login_atelier_bg.jpg"
          />
          <!-- Subtle Obsidian Overlays to preserve library luminosity while ensuring pristine text contrast -->
          <div class="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 via-obsidian-950/25 to-obsidian-950/50"></div>
          <div class="absolute inset-0 bg-radial-vignette opacity-40" style="background: radial-gradient(circle at 50% 50%, rgba(7, 9, 12, 0.1) 0%, rgba(7, 9, 12, 0.55) 85%, rgba(6, 8, 11, 0.88) 100%);"></div>
          <!-- Warm Golden Ambient Radiance behind central area -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[650px] bg-gold-400/15 rounded-full blur-[140px] mix-blend-screen pointer-events-none"></div>
        </div>
        <!-- END: AtmosphericBackground -->

        <!-- BEGIN: MainHeader -->
        <header class="relative z-20 w-full px-6 lg:px-14 py-5 flex items-center justify-between border-b border-gold-400/10 backdrop-blur-md bg-obsidian-950/25" data-purpose="top-navigation-bar">
          <!-- Brand Identity with Official Logo -->
          <a class="flex items-center gap-3 group cursor-pointer" href="#/home">
            <img src="logo.svg" alt="NovelCast Logo" class="h-9 w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(242,212,121,0.35)] transition-transform group-hover:scale-105" />
            <span class="font-editorial-serif text-lg font-semibold tracking-luxury text-ivory-50 uppercase">NovelCast</span>
          </a>
          <!-- Minimal Right Navigation Links -->
          <nav class="flex items-center gap-6">
            <span class="hidden sm:inline-flex items-center gap-2 text-[10px] tracking-widest-plus uppercase text-gold-400/80">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400/80"></span>
              Studio Sanctuary
            </span>
            <a class="group flex items-center gap-1.5 text-xs uppercase tracking-luxury text-ivory-300 hover:text-gold-200 transition-colors duration-200" href="#/home">
              <span>Catalog</span>
              <svg class="w-3.5 h-3.5 text-gold-400 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 8l4 4m0 0l-4 4m4-4H3" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>
              </svg>
            </a>
          </nav>
        </header>
        <!-- END: MainHeader -->

        <!-- BEGIN: MainContent -->
        <main class="relative z-10 flex-grow flex items-center justify-center px-4 py-8 md:py-12" data-purpose="editorial-auth-section">
          <!-- Center Auth Card Container: Ultra-sleek, clean, minimal glass modal -->
          <div class="w-full max-w-[430px] sanctuary-glass rounded-2xl p-7 md:p-9 relative transition-all duration-300">
            <!-- Editorial Card Header with Official NovelCast Logo -->
            <header class="text-center mb-6">
              <div class="flex justify-center mb-3.5">
                <img src="logo.svg" alt="NovelCast Logo" class="h-12 w-auto object-contain filter drop-shadow-[0_2px_16px_rgba(242,212,121,0.45)] transition-transform hover:scale-105 duration-300" />
              </div>
              <p class="text-[9px] uppercase tracking-luxury text-gold-400/80 font-medium mb-1.5">
                Private Press Atelier
              </p>
              <h1 class="font-editorial-serif text-3xl sm:text-[34px] text-ivory-50 font-normal tracking-wide leading-tight mb-2">
                Where Stories <span class="italic font-light text-gold-300">Breathe.</span>
              </h1>
              <p class="text-xs text-ivory-400 font-light" id="auth-subtitle">
                Enter the sanctuary to resume your auditory archive.
              </p>
            </header>

            <!-- Sleek Minimalist Tab Switcher -->
            <div aria-label="Authentication Modes" class="grid grid-cols-2 p-1 mb-6 rounded-xl bg-black/40 border border-gold-400/15 text-xs tracking-widest uppercase font-medium" role="tablist">
              <button aria-controls="auth-form" aria-selected="true" class="py-1.5 rounded-lg gold-pill-active transition-all duration-200 cursor-pointer" id="tab-signin" role="tab" type="button">
                Sign In
              </button>
              <button aria-controls="auth-form" aria-selected="false" class="py-1.5 rounded-lg text-ivory-400 hover:text-ivory-200 transition-all duration-200 cursor-pointer" id="tab-signup" role="tab" type="button">
                Request Access
              </button>
            </div>

            <!-- Email Verified Banner (shown if URL has confirmed=true) -->
            <div id="auth-verified-banner" class="hidden mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center leading-relaxed">
              ✦ Email confirmed successfully! You may now sign in to your sanctuary archive.
            </div>

            <!-- Alert / Error Display -->
            <div id="auth-alert" class="hidden mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs text-center leading-relaxed"></div>

            <!-- Confirmation Dispatch Notice (Hidden by default; shown upon sign up requiring email verification) -->
            <div id="confirmation-notice" class="hidden text-center py-3 space-y-4">
              <div class="w-12 h-12 rounded-full bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-gold-300 mx-auto shadow-[0_0_20px_rgba(242,212,121,0.2)]">
                <svg class="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <h3 class="font-editorial-serif text-2xl text-ivory-50 font-normal">Confirmation Sent</h3>
                <p class="text-xs text-ivory-300 font-light mt-1.5 max-w-xs mx-auto leading-relaxed">
                  A verification dispatch has been sent to <span id="confirmed-email-display" class="text-gold-300 font-mono font-medium"></span>.
                </p>
                <p class="text-[11px] text-ivory-400/80 mt-2 max-w-xs mx-auto leading-normal">
                  Please check your inbox (and spam folder) and click the confirmation link to activate your access before signing in.
                </p>
              </div>
              <div class="pt-2 space-y-2">
                <button id="btn-back-to-signin" type="button" class="w-full gold-cta-btn py-2.5 px-5 rounded-xl text-obsidian-950 font-semibold text-xs tracking-luxury uppercase cursor-pointer">
                  Proceed to Sign In
                </button>
                <button id="btn-resend-confirmation" type="button" class="w-full py-1.5 text-[11px] text-gold-400 hover:text-gold-300 transition-colors cursor-pointer">
                  Didn't receive email? Resend verification link
                </button>
              </div>
            </div>

            <!-- Minimal Form Fields -->
            <form action="#authenticate" class="space-y-3.5" data-purpose="credential-form" id="auth-form" method="POST">
              <!-- Full Name (Hidden initially for sign in) -->
              <div class="hidden space-y-1 transition-all" id="field-fullname">
                <label class="block text-[10px] uppercase tracking-widest text-gold-300/80 font-medium" for="sanctuary-name">
                  Name
                </label>
                <div class="rounded-xl input-glass px-3.5 py-2.5">
                  <input class="w-full bg-transparent border-0 p-0 text-sm text-ivory-100 placeholder-ivory-500/40 focus:ring-0 focus:outline-none" id="sanctuary-name" name="fullname" placeholder="Julian Vane" type="text" />
                </div>
              </div>

              <!-- Email Address -->
              <div class="space-y-1">
                <label class="block text-[10px] uppercase tracking-widest text-gold-300/80 font-medium" for="sanctuary-id">
                  Email Address
                </label>
                <div class="rounded-xl input-glass px-3.5 py-2.5">
                  <input class="w-full bg-transparent border-0 p-0 text-sm text-ivory-100 placeholder-ivory-500/40 focus:ring-0 focus:outline-none" id="sanctuary-id" name="email" placeholder="archivist@novelcast.atelier" required type="email" />
                </div>
              </div>

              <!-- Master Cipher / Password -->
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <label class="block text-[10px] uppercase tracking-widest text-gold-300/80 font-medium" for="master-cipher">
                    Master Cipher
                  </label>
                  <a class="text-[10px] text-ivory-400 hover:text-gold-300 transition-colors cursor-pointer" id="link-forgot-cipher">
                    Forgot?
                  </a>
                </div>
                <div class="relative rounded-xl input-glass px-3.5 py-2.5 flex items-center">
                  <input class="w-full bg-transparent border-0 p-0 text-sm text-ivory-100 placeholder-ivory-500/40 focus:ring-0 focus:outline-none" id="master-cipher" name="password" placeholder="••••••••••••" required minlength="6" type="password" />
                  <button aria-label="Toggle password visibility" class="text-ivory-400/70 hover:text-gold-300 ml-2 focus:outline-none cursor-pointer" id="toggle-password" type="button">
                    <svg class="w-3.5 h-3.5" fill="none" id="icon-eye-open" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>
                    </svg>
                    <svg class="w-3.5 h-3.5 hidden" fill="none" id="icon-eye-closed" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Remember device checkbox -->
              <div class="flex items-center pt-0.5">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input checked class="w-3.5 h-3.5 rounded bg-black/50 border-gold-400/30 text-gold-500 focus:ring-gold-400/40 focus:ring-offset-0" name="remember" type="checkbox" />
                  <span class="text-[11px] text-ivory-300/80">Remember on this device</span>
                </label>
              </div>

              <!-- Sleek Gold Primary CTA Button -->
              <div class="pt-2">
                <button class="w-full gold-cta-btn py-2.5 px-5 rounded-xl text-obsidian-950 font-semibold text-xs tracking-luxury uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md" id="btn-submit" type="submit">
                  <span id="btn-submit-text">Enter Atelier</span>
                  <svg id="auth-spinner" class="hidden animate-spin h-3.5 w-3.5 text-obsidian-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                </button>
              </div>
            </form>

            <!-- Refined Subtext Footer -->
            <footer class="mt-5 text-center text-[11px] text-ivory-400/70" data-purpose="auth-card-footer">
              <p>
                Secured via Supabase Authentication under the <a class="text-ivory-300 hover:text-gold-300 underline decoration-gold-400/30 transition-colors" href="#/home">Atelier Codex</a>.
              </p>
            </footer>
          </div>
        </main>
        <!-- END: MainContent -->

        <!-- BEGIN: MainFooter -->
        <footer class="relative z-20 w-full px-6 lg:px-14 py-4 border-t border-gold-400/10 backdrop-blur-md bg-obsidian-950/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] tracking-wider uppercase text-ivory-400/80" data-purpose="site-footer">
          <div>
            <span>© 2025 NovelCast Nocturne Atelier</span>
          </div>
          <div class="flex items-center gap-3 text-gold-300/75">
            <span>Dolby Atmos Binaural</span>
            <span class="text-gold-400/30">•</span>
            <span>FLAC 96kHz Master</span>
          </div>
        </footer>
        <!-- END: MainFooter -->

      </div>
    `;
  },

  init: function () {
    const auth = window.NovelCastAuth;
    const user = auth ? auth.getUser() : null;

    if (user) {
      const signoutBtn = document.getElementById('btn-auth-signout');
      if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
          auth.signOut();
        });
      }
      return;
    }

    let isSignUp = false;
    let lastEmailAttempted = '';
    const tabSignIn = document.getElementById('tab-signin');
    const tabSignUp = document.getElementById('tab-signup');
    const fieldFullName = document.getElementById('field-fullname');
    const authSubtitle = document.getElementById('auth-subtitle');
    const btnSubmitText = document.getElementById('btn-submit-text');
    const linkForgotCipher = document.getElementById('link-forgot-cipher');
    const form = document.getElementById('auth-form');
    const confirmationNotice = document.getElementById('confirmation-notice');
    const confirmedEmailDisplay = document.getElementById('confirmed-email-display');
    const btnBackToSignIn = document.getElementById('btn-back-to-signin');
    const btnResendConfirmation = document.getElementById('btn-resend-confirmation');
    const verifiedBanner = document.getElementById('auth-verified-banner');
    const alertBox = document.getElementById('auth-alert');
    const spinner = document.getElementById('auth-spinner');
    const submitBtn = document.getElementById('btn-submit');

    // Check for email confirmation in URL query or hash
    const hashStr = window.location.hash || '';
    if (hashStr.includes('confirmed=true') || hashStr.includes('type=signup') || hashStr.includes('access_token')) {
      if (verifiedBanner) verifiedBanner.classList.remove('hidden');
    }

    function activateSignIn() {
      isSignUp = false;
      tabSignIn.classList.add('gold-pill-active');
      tabSignIn.classList.remove('text-ivory-400');
      tabSignIn.setAttribute('aria-selected', 'true');

      tabSignUp.classList.remove('gold-pill-active');
      tabSignUp.classList.add('text-ivory-400');
      tabSignUp.setAttribute('aria-selected', 'false');

      if (fieldFullName) fieldFullName.classList.add('hidden');
      if (authSubtitle) authSubtitle.textContent = 'Enter the sanctuary to resume your auditory archive.';
      if (btnSubmitText) btnSubmitText.textContent = 'Enter Atelier';
      if (linkForgotCipher) linkForgotCipher.classList.remove('invisible');
      if (confirmationNotice) confirmationNotice.classList.add('hidden');
      if (form) form.classList.remove('hidden');
      hideAlert();
    }

    function activateSignUp() {
      isSignUp = true;
      tabSignUp.classList.add('gold-pill-active');
      tabSignUp.classList.remove('text-ivory-400');
      tabSignUp.setAttribute('aria-selected', 'true');

      tabSignIn.classList.remove('gold-pill-active');
      tabSignIn.classList.add('text-ivory-400');
      tabSignIn.setAttribute('aria-selected', 'false');

      if (fieldFullName) fieldFullName.classList.remove('hidden');
      if (authSubtitle) authSubtitle.textContent = 'Request membership into the Nocturne Private Press archive.';
      if (btnSubmitText) btnSubmitText.textContent = 'Request Invitation';
      if (linkForgotCipher) linkForgotCipher.classList.add('invisible');
      if (confirmationNotice) confirmationNotice.classList.add('hidden');
      if (form) form.classList.remove('hidden');
      hideAlert();
    }

    if (tabSignIn) tabSignIn.addEventListener('click', activateSignIn);
    if (tabSignUp) tabSignUp.addEventListener('click', activateSignUp);

    if (btnBackToSignIn) {
      btnBackToSignIn.addEventListener('click', () => {
        activateSignIn();
      });
    }

    if (btnResendConfirmation) {
      btnResendConfirmation.addEventListener('click', async () => {
        const email = lastEmailAttempted || (document.getElementById('sanctuary-id') ? document.getElementById('sanctuary-id').value.trim() : '');
        if (!email) {
          showAlert('Please enter your email address to resend the confirmation link.');
          return;
        }
        try {
          await auth.resendConfirmation(email);
          window.NovelCast.toast('New confirmation dispatch sent to ' + email);
        } catch (e) {
          showAlert(e.message || 'Could not resend confirmation email.');
        }
      });
    }

    // Toggle Cipher Visibility
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('master-cipher');
    const iconEyeOpen = document.getElementById('icon-eye-open');
    const iconEyeClosed = document.getElementById('icon-eye-closed');

    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        if (iconEyeOpen) iconEyeOpen.classList.toggle('hidden', isPassword);
        if (iconEyeClosed) iconEyeClosed.classList.toggle('hidden', !isPassword);
      });
    }

    // Forgot Cipher
    if (linkForgotCipher) {
      linkForgotCipher.addEventListener('click', async () => {
        const emailInput = document.getElementById('sanctuary-id');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          showAlert('Please enter your Patron Email Address above to receive a recovery cipher.');
          return;
        }
        try {
          if (auth && auth.resetPasswordForEmail) {
            await auth.resetPasswordForEmail(email);
            window.NovelCast.toast('Recovery instructions dispatched to ' + email);
          } else {
            window.NovelCast.toast('Recovery cipher sent to ' + email);
          }
        } catch (e) {
          showAlert(e.message || 'Could not send recovery cipher');
        }
      });
    }

    function showAlert(content) {
      if (!alertBox) return;
      if (typeof content === 'string') {
        alertBox.innerHTML = `<div>${content}</div>`;
      } else {
        alertBox.innerHTML = '';
        alertBox.appendChild(content);
      }
      alertBox.classList.remove('hidden');
    }
    function hideAlert() {
      if (!alertBox) return;
      alertBox.classList.add('hidden');
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById('sanctuary-id').value.trim();
        const password = document.getElementById('master-cipher').value;
        const nameInput = document.getElementById('sanctuary-name');
        const fullname = nameInput ? nameInput.value.trim() : '';
        lastEmailAttempted = email;

        submitBtn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');

        try {
          if (isSignUp) {
            // Sign up via Supabase
            const data = await auth.signUp(email, password, { data: { full_name: fullname } });
            
            // Check if confirmation email was dispatched (session is null)
            if (!data.session) {
              // Hide form and show confirmation notice
              form.classList.add('hidden');
              if (confirmationNotice) {
                confirmationNotice.classList.remove('hidden');
                if (confirmedEmailDisplay) confirmedEmailDisplay.textContent = email;
              }
              window.NovelCast.toast('Confirmation dispatch sent to ' + email);
              return;
            }

            // Auto-confirmed fallback (if project has email confirmations disabled)
            window.NovelCast.toast('Welcome to the Sanctuary');
            const params = new URLSearchParams(location.hash.split('?')[1] || '');
            const redirect = params.get('redirect') || 'library';
            window.NovelCastRouter.navigate(redirect);
          } else {
            // Sign in via Supabase
            await auth.signIn(email, password);
            window.NovelCast.toast('Welcome back to the Sanctuary');

            const params = new URLSearchParams(location.hash.split('?')[1] || '');
            const redirect = params.get('redirect') || 'library';
            window.NovelCastRouter.navigate(redirect);
          }
        } catch (err) {
          if (err.code === 'email_not_confirmed') {
            const container = document.createElement('div');
            container.className = 'space-y-2';
            container.innerHTML = `
              <p>${err.message}</p>
              <button id="btn-alert-resend" type="button" class="underline text-gold-300 hover:text-white font-medium text-[11px] cursor-pointer">
                Resend Confirmation Email
              </button>
            `;
            showAlert(container);
            const alertResendBtn = document.getElementById('btn-alert-resend');
            if (alertResendBtn) {
              alertResendBtn.addEventListener('click', async () => {
                try {
                  await auth.resendConfirmation(email);
                  window.NovelCast.toast('Confirmation email resent to ' + email);
                } catch (resendErr) {
                  window.NovelCast.toast(resendErr.message || 'Error resending email');
                }
              });
            }
          } else {
            showAlert(err.message || 'Authentication cipher invalid. Please check your credentials.');
          }
        } finally {
          submitBtn.disabled = false;
          if (spinner) spinner.classList.add('hidden');
        }
      });
    }
  }
};
