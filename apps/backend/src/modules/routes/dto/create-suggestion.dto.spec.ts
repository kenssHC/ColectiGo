import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSuggestionDto } from './create-suggestion.dto';

describe('CreateSuggestionDto', () => {
  it('acepta y normaliza una sugerencia válida', async () => {
    const dto = plainToInstance(CreateSuggestionDto, {
      type: 'fare',
      description: '  La tarifa publicada no coincide  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.description).toBe('La tarifa publicada no coincide');
  });

  it.each(['', '   '])('rechaza un mensaje vacío: %j', async (description) => {
    const dto = plainToInstance(CreateSuggestionDto, {
      type: 'other',
      description,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rechaza mensajes con más de 1000 caracteres', async () => {
    const dto = plainToInstance(CreateSuggestionDto, {
      type: 'route_path',
      description: 'a'.repeat(1_001),
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rechaza tipos desconocidos', async () => {
    const dto = plainToInstance(CreateSuggestionDto, {
      type: 'spam',
      description: 'Mensaje válido',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
