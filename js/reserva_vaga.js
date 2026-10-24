document.addEventListener("DOMContentLoaded", function () {

    // ELEMENTOS DO FORMULÁRIO

    const form = document.getElementById("formReserva");

    const vaga = document.getElementById("n_vaga");
    const placa = document.getElementById("placaVeiculo_visitante");
    const tipoVaga = document.getElementById("tipo_vaga");
    const motivo = document.getElementById("motivo_vaga");
    const dataVaga = document.getElementById("data_vaga");
    const horaEntrada = document.getElementById("hora_entrada");
    const horaSaida = document.getElementById("hora_saida");


    // DATA MÍNIMA = HOJE

    const hoje = new Date();

    const ano = hoje.getFullYear();

    const mes = String(
        hoje.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        hoje.getDate()
    ).padStart(2, "0");

    const dataHoje = `${ano}-${mes}-${dia}`;

    dataVaga.min = dataHoje;


    // FORMATAÇÃO DA PLACA

    placa.addEventListener("input", function () {

        let valor = placa.value.toUpperCase();

        // Remove caracteres especiais
        valor = valor.replace(/[^A-Z0-9]/g, "");

        // Máximo de 7 caracteres
        valor = valor.substring(0, 7);


        // Placa antiga
        // ABC1234 → ABC-1234
        if (
            valor.length === 7 &&
            /^[A-Z]{3}[0-9]{4}$/.test(valor)
        ) {

            valor =
                valor.substring(0, 3) +
                "-" +
                valor.substring(3);

        }


        placa.value = valor;

    });


    // ENVIO DO FORMULÁRIO

    form.addEventListener("submit", function (event) {

        event.preventDefault();


        // PEGAR VALORES


        const numeroVaga = vaga.value.trim();

        const placaValor =
            placa.value.toUpperCase();

        const tipoVagaValor =
            tipoVaga.value;

        const motivoValor =
            motivo.value.trim();

        const dataValor =
            dataVaga.value;

        const entradaValor =
            horaEntrada.value;

        const saidaValor =
            horaSaida.value;


        // VALIDAR VAGA

        if (!/^[0-9]+$/.test(numeroVaga)) {

            alert(
                "Digite um número de vaga válido."
            );

            vaga.focus();

            return;
        }


        // VALIDAR PLACA

        // Formato antigo
        // ABC-1234
        const placaAntiga =
            /^[A-Z]{3}-[0-9]{4}$/;


        // Formato Mercosul
        // ABC1D23
        const placaMercosul =
            /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;


        if (
            !placaAntiga.test(placaValor) &&
            !placaMercosul.test(placaValor)
        ) {

            alert(
                "Placa inválida.\n\n" +
                "Exemplos válidos:\n" +
                "ABC-1234\n" +
                "ABC1D23"
            );

            placa.focus();

            return;
        }


        // VALIDAR TIPO DA VAGA

        if (tipoVagaValor === "") {

            alert(
                "Selecione o tipo da vaga."
            );

            tipoVaga.focus();

            return;
        }


        // VALIDAR MOTIVO

        if (motivoValor.length < 3) {

            alert(
                "Informe o motivo da reserva."
            );

            motivo.focus();

            return;
        }



        // VALIDAR DATA

        if (dataValor === "") {

            alert(
                "Selecione a data da reserva."
            );

            dataVaga.focus();

            return;
        }


        if (dataValor < dataHoje) {

            alert(
                "Não é possível fazer uma reserva para uma data passada."
            );

            dataVaga.focus();

            return;
        }


        // VALIDAR HORÁRIOS

        if (
            entradaValor === "" ||
            saidaValor === ""
        ) {

            alert(
                "Informe o horário de entrada e saída."
            );

            return;
        }


        if (entradaValor >= saidaValor) {

            alert(
                "O horário de saída deve ser maior que o horário de entrada."
            );

            horaSaida.focus();

            return;
        }


        // PEGAR RESERVAS EXISTENTES


        let reservas =
            JSON.parse(
                localStorage.getItem(
                    "reservasVagas"
                )
            ) || [];


        // VERIFICAR CONFLITO

        const conflito = reservas.some(
            function (reserva) {

                // Mesma vaga?
                if (
                    String(reserva.vaga) !==
                    String(numeroVaga)
                ) {
                    return false;
                }


                // Mesma data?
                if (
                    reserva.data !== dataValor
                ) {
                    return false;
                }


                // Conflito de horário?
                return (
                    entradaValor <
                    reserva.horaSaida &&

                    saidaValor >
                    reserva.horaEntrada
                );

            }
        );


        // SE A VAGA ESTIVER OCUPADA

        if (conflito) {

            alert(
                `A vaga ${numeroVaga} já está ` +
                `reservada nesse horário.`
            );

            return;
        }


        // CRIAR NOVA RESERVA

        const novaReserva = {

            id: Date.now(),

            vaga: numeroVaga,

            placa: placaValor,

            tipoVaga: tipoVagaValor,

            motivo: motivoValor,

            data: dataValor,

            horaEntrada: entradaValor,

            horaSaida: saidaValor

        };


        // ADICIONAR RESERVA

        reservas.push(novaReserva);


        // SALVAR

        localStorage.setItem(
            "reservasVagas",
            JSON.stringify(reservas)
        );


        // SUCESSO

        alert(
            "Reserva cadastrada com sucesso!\n\n" +

            `Vaga: ${numeroVaga}\n` +

            `Placa: ${placaValor}\n` +

            `Tipo: ${tipoVagaValor}\n` +

            `Motivo: ${motivoValor}\n` +

            `Data: ${dataValor}\n` +

            `Horário: ${entradaValor} às ${saidaValor}`
        );


        // LIMPAR

        form.reset();

    });

});