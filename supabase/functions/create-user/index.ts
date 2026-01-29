import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, nome, role } = await req.json();

    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ error: "Email, password e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header to identify the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if caller is DIRETOR or GERENTE
    const { data: callerRole, error: roleCheckError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (roleCheckError || !callerRole) {
      return new Response(
        JSON.stringify({ error: "Não foi possível verificar permissões" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isDirector = callerRole.role === "DIRETOR";
    const isGerente = callerRole.role === "GERENTE";

    if (!isDirector && !isGerente) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerentes só podem criar CORRETORES
    const targetRole = isGerente ? "CORRETOR" : (role || "CORRETOR");
    
    if (isGerente && role && role !== "CORRETOR") {
      return new Response(
        JSON.stringify({ error: "Gerentes só podem criar corretores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's profile ID if gerente
    let gerenteProfileId: string | null = null;
    if (isGerente) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      
      gerenteProfileId = callerProfile?.id || null;
    }

    // Create user with admin client (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (authError) {
      console.error("Auth error:", authError);
      let message = authError.message;
      if (message.includes("already been registered")) {
        message = "Este email já está cadastrado";
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update role to target role
    if (targetRole !== "CORRETOR") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: targetRole })
        .eq("user_id", authData.user.id);

      if (roleError) {
        console.error("Role update error:", roleError);
      }
    }

    // If created by gerente, set the gerente_id on the new user's profile
    if (isGerente && gerenteProfileId) {
      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ gerente_id: gerenteProfileId })
        .eq("user_id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${targetRole === "CORRETOR" ? "Corretor" : targetRole} criado com sucesso!`,
        user_id: authData.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
