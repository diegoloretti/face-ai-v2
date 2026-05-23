export const ERROR_MAP: Record<string, string> = {
  NotAllowedError: 'Permissão da câmera negada. Habilite nas configurações do navegador.',
  NotFoundError: 'Câmera não encontrada no dispositivo.',
  NotReadableError: 'Câmera está em uso por outro aplicativo.',
  OverconstrainedError: 'Câmera incompatível com os requisitos.',
  NetworkError: 'Sem conexão. Verifique sua internet.',
  TimeoutError: 'Tempo esgotado. Tente novamente.',
  LIVENESS_FAIL: 'Não conseguimos confirmar sua presença. Tente em um ambiente bem iluminado.',
  ANTISPOOF_FAIL: 'Detectamos uso de foto ou tela. Use sua imagem ao vivo.',
  NO_FACE: 'Nenhum rosto detectado. Centralize seu rosto no oval.',
  MULTIPLE_FACES: 'Mais de uma pessoa detectada. Fique sozinho na frente da câmera.',
  RATE_LIMIT: 'Muitas tentativas. Tente novamente em alguns minutos.',
  INVALID_PAYLOAD: 'Dados inválidos. Recarregue a página.',
  INTERNAL: 'Erro temporário. Tente novamente.',
  UNKNOWN: 'Verifique a câmera e as permissões do navegador.',
}

export function mapErrorToMessage(err: unknown): string {
  if (err == null) return ERROR_MAP.UNKNOWN
  if (typeof err === 'string') {
    return ERROR_MAP[err] ?? ERROR_MAP.UNKNOWN
  }
  if (err instanceof Error && err.name) {
    return ERROR_MAP[err.name] ?? ERROR_MAP.UNKNOWN
  }
  return ERROR_MAP.UNKNOWN
}
