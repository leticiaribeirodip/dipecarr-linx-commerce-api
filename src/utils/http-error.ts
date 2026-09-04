/**
 * Erro com status HTTP explícito.
 *
 * Sem isto, qualquer falha de validação (template inválido, arquivo corrompido)
 * chega no error-handler como Error genérico e vira 500, escondendo o motivo
 * real do problema do cliente da API.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
