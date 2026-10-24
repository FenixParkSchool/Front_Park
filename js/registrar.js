document.addEventListener('DOMContentLoaded', () => {
    const formRegistro = document.getElementById('formRegistro');
    const inputNome = document.getElementById('nome');
    const inputEmail = document.getElementById('email');
    const inputPerfil = document.getElementById('perfil');
    const inputSenha = document.getElementById('senha');
    const inputConfirmarSenha = document.getElementById('confirmarSenha');
    const passwordFeedback = document.getElementById('passwordMismatchFeedback');
    const toggleButtons = document.querySelectorAll('.btn-toggle-password');
    const btnCadastrar = formRegistro.querySelector('button[type="submit"]');

    const btnAceitarModal = document.getElementById("btn_aceitar_modal");
    const checkboxTermosPrincipal = document.getElementById("termos");

    // Limpeza de storages antigos e dados sensíveis conforme restrições
    localStorage.removeItem('park_solicitacoes');
    localStorage.removeItem('senha');
    localStorage.removeItem('user');
    sessionStorage.clear();

    if (btnAceitarModal && checkboxTermosPrincipal) {
        btnAceitarModal.addEventListener("click", function () {
            checkboxTermosPrincipal.checked = true;
            const modalElement = document.getElementById("modalTermos");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            const icon = button.querySelector('i');

            if (!targetInput || !icon) return;

            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    function validarSenhas() {
        const senha = inputSenha.value;
        const confirmar = inputConfirmarSenha.value;
        const inputGroup = inputConfirmarSenha.closest('.ds-input-group');

        if (confirmar.length > 0 && senha !== confirmar) {
            inputGroup?.classList.add('is-invalid');
            passwordFeedback?.classList.remove('d-none');
            passwordFeedback?.classList.add('d-block');
            return false;
        }

        inputGroup?.classList.remove('is-invalid');
        passwordFeedback?.classList.add('d-none');
        passwordFeedback?.classList.remove('d-block');
        return true;
    }

    inputSenha.addEventListener('input', validarSenhas);
    inputConfirmarSenha.addEventListener('input', validarSenhas);

    formRegistro.addEventListener('submit', async (event) => {
        event.preventDefault();

        const senhasConferem = validarSenhas();

        if (!formRegistro.checkValidity() || !senhasConferem) {
            event.stopPropagation();
            formRegistro.classList.add('was-validated');
            return;
        }

        const username = inputNome.value.trim();
        const email = inputEmail.value.trim();
        const perfilVal = inputPerfil.value;
        const senhaHash = inputSenha.value;

        // Mapear o select de perfil para o ID numérico correspondente na API (conforme B09/B13)
        // Ajuste os valores conforme o seu banco/contrato (ex: 1 para Funcionário, 2 para Vigilante, etc.)
        let idTipoUsuario = 1;
        if (perfilVal === 'supervisor') idTipoUsuario = 2; // Vigilância
        else if (perfilVal === 'admin') idTipoUsuario = 1; // Funcionário/Admin

        // Desabilitar o botão enquanto aguarda a resposta da API
        if (btnCadastrar) {
            btnCadastrar.disabled = true;
            btnCadastrar.textContent = "A cadastrar...";
        }

        try {
            const response = await fetch("http://localhost:3000/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    senhaHash: senhaHash, // A API recebe a senha neste campo e calcula o hash no servidor
                    idTipoUsuario: Number(idTipoUsuario)
                })
            });

            const data = await response.json();

            if (response.status === 201) {
                alert("Conta cadastrada com sucesso! Redirecionando para o login.");
                window.location.href = 'login.html';
            } else if (response.status === 409) {
                alert(data.error || "Este e-mail já está cadastrado no sistema.");
                inputEmail.focus();
            } else {
                alert(data.error || "Erro ao realizar o cadastro. Verifique os dados.");
            }
        } catch (error) {
            console.error("Erro na comunicação com a API:", error);
            alert("Não foi possível conectar ao servidor. Tente novamente mais tarde.");
        } finally {
            if (btnCadastrar) {
                btnCadastrar.disabled = false;
                btnCadastrar.textContent = "Criar Conta";
            }
        }
    });
});