import { queryOne, getDb, logAction } from './db.ts';
import { saveNewAnuncio } from './anunciosRepository.ts';
import { MLItemData } from '../services/mercadolivre/mlService.ts';

export async function seedInitialDataIfEmpty() {
  await getDb();
  const countRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM anuncios');
  if (countRow && countRow.count > 0) {
    return; // Already has data
  }

  console.log('Populando banco inicial SQLite com anúncios de exemplo...');

  const item1: MLItemData = {
    mlb_id: 'MLB3564789123',
    titulo: 'Tênis Esportivo Corrida Masculino Confortável Amortecimento',
    subtitulo: 'Lançamento Coleção Esportiva Pro Runner',
    descricao: `Tênis Esportivo Corrida Masculino Confortável Amortecimento Premium

Desenvolvido para corredores que buscam alta absorção de impacto, leveza e durabilidade. O cabedal em tecido respirável mantém os pés arejados durante os treinos mais intensos.

CARACTERÍSTICAS PRINCIPAIS:
• Entressola com tecnologia de espuma responsiva
• Solado em borracha antiderrapante com ranhuras de tração
• Palmilha anatômica em EVA antibacteriana
• Drop: 8mm ideal para corrida de rua e academia
• Peso aproximado: 260g (tamanho 41)

ITENS INCLUSOS:
- 1 Par de Tênis Esportivo
- 1 Par de Cadarços Reforçados
- Caixa Original

GARANTIA:
Garantia de 90 dias contra defeitos de fabricação direto pelo fabricante.`,
    categoria_id: 'MLB1088',
    categoria_nome: 'Calçados, Roupas e Bolsas > Calçados > Tênis',
    preco: 189.90,
    preco_promocional: 159.90,
    moeda: 'BRL',
    condicao: 'new',
    quantidade: 45,
    vendidos: 320,
    status: 'active',
    tipo_anuncio: 'gold_pro',
    permalink: 'https://produto.mercadolivre.com.br/MLB-3564789123-tenis-corrida',
    sku: 'TENIS-RUN-01',
    gtin: '7891234567890',
    ean: '7891234567890',
    marca: 'AeroSport',
    modelo: 'Pulse X9',
    fabricante: 'AeroSport Brasil Ltda',
    linha: 'Performance 2026',
    genero: 'Masculino',
    material: 'Mesh Respirável e Borracha',
    cor: 'Preto / Laranja',
    tamanho: '41',
    data_criacao: '2026-01-15T14:30:00.000Z',
    data_atualizacao: '2026-03-20T10:15:00.000Z',
    data_importacao: new Date().toISOString(),
    raw_json: JSON.stringify({
      id: 'MLB3564789123',
      title: 'Tênis Esportivo Corrida Masculino Confortável Amortecimento',
      price: 189.90,
      seller_id: 12345678,
      status: 'active',
      sample: true,
    }, null, 2),
    imagens: [
      {
        ml_image_id: 'MLB3564789123_01',
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
        url_original: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
        ordem: 0,
      },
      {
        ml_image_id: 'MLB3564789123_02',
        url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
        url_original: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
      },
      {
        ml_image_id: 'MLB3564789123_03',
        url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
        url_original: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
        ordem: 2,
      },
    ],
    atributos: [
      { attribute_id: 'BRAND', nome: 'Marca', valor: 'AeroSport' },
      { attribute_id: 'MODEL', nome: 'Modelo', valor: 'Pulse X9' },
      { attribute_id: 'GENDER', nome: 'Gênero', valor: 'Masculino' },
      { attribute_id: 'AGE_GROUP', nome: 'Idade', valor: 'Adultos' },
      { attribute_id: 'FASTENER_TYPE', nome: 'Tipo de ajuste', valor: 'Cadarços' },
      { attribute_id: 'SURFACE_TYPE', nome: 'Superfícies aptas', valor: 'Asfalto, Esteira, Academia' },
    ],
    variacoes: [
      {
        variation_id: 'VAR_1001',
        sku: 'TENIS-RUN-BLK-39',
        preco: 189.90,
        estoque: 12,
        gtin: '7891234567891',
        cor: 'Preto',
        tamanho: '39',
        atributos: [
          { attribute_id: 'COLOR', nome: 'Cor', valor: 'Preto' },
          { attribute_id: 'SIZE', nome: 'Tamanho', valor: '39' },
        ],
      },
      {
        variation_id: 'VAR_1002',
        sku: 'TENIS-RUN-BLK-40',
        preco: 189.90,
        estoque: 18,
        gtin: '7891234567892',
        cor: 'Preto',
        tamanho: '40',
        atributos: [
          { attribute_id: 'COLOR', nome: 'Cor', valor: 'Preto' },
          { attribute_id: 'SIZE', nome: 'Tamanho', valor: '40' },
        ],
      },
      {
        variation_id: 'VAR_1003',
        sku: 'TENIS-RUN-BLK-41',
        preco: 189.90,
        estoque: 15,
        gtin: '7891234567893',
        cor: 'Preto',
        tamanho: '41',
        atributos: [
          { attribute_id: 'COLOR', nome: 'Cor', valor: 'Preto' },
          { attribute_id: 'SIZE', nome: 'Tamanho', valor: '41' },
        ],
      },
    ],
  };

  const item2: MLItemData = {
    mlb_id: 'MLB2876543210',
    titulo: 'Fone De Ouvido Bluetooth Sem Fio Cancelamento Ruído Ativo',
    subtitulo: 'Bateria 40 Horas com Modo Transparência',
    descricao: `Fone De Ouvido Bluetooth Sem Fio Over-Ear com Cancelamento Ativo de Ruído (ANC)

Mergulhe em uma experiência sonora cristalina com graves profundos e agudos equilibrados.

ESPECIFICAÇÕES TÉCNICAS:
- Versão Bluetooth: 5.3 com codec AAC / SBC
- Bateria: Até 40 horas com ANC ligado (60 horas desligado)
- Carregamento Rápido: 10 minutos de carga proporcionam até 5 horas de reprodução
- Microfones com IA para chamadas nítidas
- Entrada P2 3.5mm para modo com fio
- Conexão multiponto para conectar 2 aparelhos ao mesmo tempo

CONTEÚDO DA EMBALAGEM:
• 1 Headphone ANC Pro
• 1 Cabo USB Tipo-C de carregamento
• 1 Cabo de áudio P2 de 1.2m
• 1 Estojo rígido de transporte
• Manual do Usuário em Português`,
    categoria_id: 'MLB3697',
    categoria_nome: 'Eletrônicos, Áudio e Vídeo > Fones de Ouvido',
    preco: 299.00,
    preco_promocional: 249.00,
    moeda: 'BRL',
    condicao: 'new',
    quantidade: 30,
    vendidos: 180,
    status: 'active',
    tipo_anuncio: 'gold_special',
    permalink: 'https://produto.mercadolivre.com.br/MLB-2876543210-fone-bluetooth',
    sku: 'AUDIO-ANC-01',
    gtin: '7899876543210',
    ean: '7899876543210',
    marca: 'SoundWave',
    modelo: 'Nova ANC 500',
    fabricante: 'SoundWave Audio Co.',
    linha: 'Audiophile Pro',
    cor: 'Grafite Fosco',
    data_criacao: '2026-02-10T11:00:00.000Z',
    data_atualizacao: '2026-03-25T16:45:00.000Z',
    data_importacao: new Date(Date.now() - 3600000 * 24).toISOString(),
    raw_json: JSON.stringify({
      id: 'MLB2876543210',
      title: 'Fone De Ouvido Bluetooth Sem Fio Cancelamento Ruído Ativo',
      price: 299.00,
      seller_id: 98765432,
      status: 'active',
      sample: true,
    }, null, 2),
    imagens: [
      {
        ml_image_id: 'MLB2876543210_01',
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        url_original: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        ordem: 0,
      },
      {
        ml_image_id: 'MLB2876543210_02',
        url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
        url_original: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
      },
    ],
    atributos: [
      { attribute_id: 'BRAND', nome: 'Marca', valor: 'SoundWave' },
      { attribute_id: 'MODEL', nome: 'Modelo', valor: 'Nova ANC 500' },
      { attribute_id: 'BLUETOOTH', nome: 'Com Bluetooth', valor: 'Sim' },
      { attribute_id: 'MICROPHONE', nome: 'Com Microfone', valor: 'Sim' },
      { attribute_id: 'BATTERY_CAPACITY', nome: 'Duração da bateria', valor: '40 horas' },
      { attribute_id: 'NOISE_CANCELLING', nome: 'Cancelamento de ruído', valor: 'Ativo (ANC)' },
    ],
    variacoes: [
      {
        variation_id: 'VAR_2001',
        sku: 'HEADPHONE-BLK',
        preco: 299.00,
        estoque: 18,
        gtin: '7899876543211',
        cor: 'Preto Grafite',
        atributos: [
          { attribute_id: 'COLOR', nome: 'Cor', valor: 'Preto Grafite' },
        ],
      },
      {
        variation_id: 'VAR_2002',
        sku: 'HEADPHONE-SLV',
        preco: 299.00,
        estoque: 12,
        gtin: '7899876543212',
        cor: 'Prata Metálico',
        atributos: [
          { attribute_id: 'COLOR', nome: 'Cor', valor: 'Prata Metálico' },
        ],
      },
    ],
  };

  // Download imagens para o disco local nos anúncios demonstrativos
  const { downloadImageToDisk } = await import('../services/mercadolivre/mlService.ts');
  for (let i = 0; i < item1.imagens.length; i++) {
    const lp = await downloadImageToDisk(item1.mlb_id, item1.imagens[i].url, i, item1.imagens[i].ml_image_id);
    if (lp) item1.imagens[i].local_path = lp;
  }
  for (let i = 0; i < item2.imagens.length; i++) {
    const lp = await downloadImageToDisk(item2.mlb_id, item2.imagens[i].url, i, item2.imagens[i].ml_image_id);
    if (lp) item2.imagens[i].local_path = lp;
  }

  await saveNewAnuncio(item1);
  await saveNewAnuncio(item2);

  logAction('info', 'SEED_INICIAL', 'Banco SQLite populado com anúncios demonstrativos e imagens baixadas no disco');
  console.log('Seed inicial concluído com sucesso!');
}
