'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ClothingItem } from '@/types';
import type { StyleOptions, TuckStyle, SleeveStyle } from '@/lib/tryon-prompt';

interface PresetModel {
  id: string;
  name: string;
  gender: 'female' | 'male';
  bodyType: 'slim' | 'normal' | 'plus';
  image_url: string;
}

const PRESET_MODELS: PresetModel[] = [
  { id: 'female-slim',   name: '마른',   gender: 'female', bodyType: 'slim',   image_url: '/models2/female-slim.png' },
  { id: 'female-normal', name: '보통',   gender: 'female', bodyType: 'normal', image_url: '/models2/female-normal.png' },
  { id: 'female-plus',   name: '통통',   gender: 'female', bodyType: 'plus',   image_url: '/models2/female-plus.png' },
  { id: 'male-slim',     name: '마른',   gender: 'male',   bodyType: 'slim',   image_url: '/models2/male-slim.png' },
  { id: 'male-normal',   name: '보통',   gender: 'male',   bodyType: 'normal', image_url: '/models2/male-normal.png' },
  { id: 'male-plus',     name: '통통',   gender: 'male',   bodyType: 'plus',   image_url: '/models2/male-plus.png' },
];

type ClothingTab = 'top' | 'bottom' | 'shoes';

const CATEGORY_LABELS: Record<ClothingTab, string> = {
  top: '상의',
  bottom: '하의',
  shoes: '신발',
};

export default function PreviewPage() {
  // 모델 선택
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [selectedModel, setSelectedModel] = useState<PresetModel | null>(null);

  // 의류 선택
  const [clothingTab, setClothingTab] = useState<ClothingTab>('top');
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [closetLoading, setClosetLoading] = useState(false);
  const [selectedTop, setSelectedTop] = useState<ClothingItem | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<ClothingItem | null>(null);
  const [selectedShoes, setSelectedShoes] = useState<ClothingItem | null>(null);

  // 스타일 옵션
  const [tuck, setTuck] = useState<TuckStyle>('out');
  const [sleeve, setSleeve] = useState<SleeveStyle>('rolldown');

  // 결과
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 옷장 아이템 로드
  useEffect(() => {
    async function loadCloset() {
      setClosetLoading(true);
      try {
        const res = await fetch('/api/closet');
        const data = await res.json();
        if (data.items) setClosetItems(data.items);
      } catch {
        // 조회 실패 시 빈 목록 유지
      } finally {
        setClosetLoading(false);
      }
    }
    loadCloset();
  }, []);

  const filteredItems = closetItems.filter((item) => {
    if (clothingTab === 'shoes') return item.category === 'shoes';
    return item.category === clothingTab;
  });

  function getSelected(tab: ClothingTab): ClothingItem | null {
    if (tab === 'top') return selectedTop;
    if (tab === 'bottom') return selectedBottom;
    return selectedShoes;
  }

  function setSelected(tab: ClothingTab, item: ClothingItem) {
    if (tab === 'top') setSelectedTop(item);
    else if (tab === 'bottom') setSelectedBottom(item);
    else setSelectedShoes(item);
  }

  const canGenerate =
    selectedModel !== null &&
    selectedTop !== null &&
    selectedBottom !== null &&
    selectedShoes !== null;

  async function handleGenerate() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setResultImage(null);

    try {
      const origin = window.location.origin;
      const styleOptions: StyleOptions = { tuck, sleeve };

      const res = await fetch('/api/preview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelImageUrl: `${origin}${selectedModel!.image_url}`,
          topImageUrl: selectedTop!.image_url,
          bottomImageUrl: selectedBottom!.image_url,
          shoesImageUrl: selectedShoes!.image_url,
          styleOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? '오류가 발생했습니다');
        return;
      }

      setResultImage(data.imageBase64);
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다');
    } finally {
      setIsGenerating(false);
    }
  }

  // 결과 화면
  if (resultImage) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setResultImage(null)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition"
            aria-label="뒤로"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">코디 미리보기 결과</span>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={`data:image/png;base64,${resultImage}`}
              alt="가상 착용 결과"
              className="w-full h-auto"
            />
          </div>

          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={() => setResultImage(null)}
              className="flex-1 py-3 rounded-xl border border-zinc-600 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition"
            >
              다시 선택
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition"
            >
              재생성
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-zinc-100 shrink-0">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition"
          aria-label="홈으로"
        >
          <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-zinc-800">코디 미리보기</span>
          <span className="text-xs text-zinc-400">아이템을 조합하고 미리보기를 생성하세요</span>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">

        {/* 섹션 1: 프리셋 모델 선택 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">모델 선택</h2>

          {/* 성별 탭 */}
          <div className="flex gap-2 mb-3">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGender(g);
                  setSelectedModel(null);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  gender === g
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {g === 'female' ? '여성' : '남성'}
              </button>
            ))}
          </div>

          {/* 체형 선택 그리드 */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_MODELS.filter((m) => m.gender === gender).map((model) => {
              const isSelected = selectedModel?.id === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`relative rounded-xl overflow-hidden border-2 transition aspect-[3/4] ${
                    isSelected
                      ? 'border-zinc-900 shadow-lg'
                      : 'border-zinc-100 hover:border-zinc-300'
                  }`}
                >
                  <Image
                    src={model.image_url}
                    alt={`${gender === 'female' ? '여성' : '남성'} ${model.name} 모델`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 150px"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-zinc-900/10 flex items-end justify-center pb-2">
                      <span className="bg-zinc-900 text-white text-xs px-2 py-0.5 rounded-full">
                        선택됨
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <span className="text-white text-xs font-medium">{model.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 섹션 2: 의류 선택 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">의류 선택</h2>

          {/* 카테고리 탭 */}
          <div className="flex gap-2 mb-3">
            {(['top', 'bottom', 'shoes'] as ClothingTab[]).map((tab) => {
              const selected = getSelected(tab);
              return (
                <button
                  key={tab}
                  onClick={() => setClothingTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition relative ${
                    clothingTab === tab
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {CATEGORY_LABELS[tab]}
                  {selected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 아이템 그리드 */}
          {closetLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
              옷장 불러오는 중…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 text-sm gap-2">
              <svg className="w-10 h-10 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>
                {CATEGORY_LABELS[clothingTab]}가 없습니다
              </span>
              <Link href="/" className="text-xs text-zinc-500 underline underline-offset-2">
                옷 추가하러 가기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredItems.map((item) => {
                const isSelected = getSelected(clothingTab)?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(clothingTab, item)}
                    className={`relative rounded-xl overflow-hidden border-2 transition aspect-square ${
                      isSelected
                        ? 'border-zinc-900 shadow-lg'
                        : 'border-zinc-100 hover:border-zinc-300'
                    }`}
                  >
                    <Image
                      src={item.image_url}
                      alt={`${item.color} ${item.material}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 150px"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 섹션 3: 스타일 옵션 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">스타일 옵션</h2>

          <div className="space-y-3">
            {/* 상의 넣기/빼기 */}
            <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-700">상의</span>
              <div className="flex gap-1 bg-zinc-200 p-0.5 rounded-lg">
                {([['in', '넣기'], ['out', '빼기']] as [TuckStyle, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTuck(val)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      tuck === val
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 소매 */}
            <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-700">소매</span>
              <div className="flex gap-1 bg-zinc-200 p-0.5 rounded-lg">
                {([['rolldown', '그대로'], ['rollup', '롤업']] as [SleeveStyle, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSleeve(val)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      sleeve === val
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 선택 요약 */}
        {(selectedModel || selectedTop || selectedBottom || selectedShoes) && (
          <section className="bg-zinc-50 rounded-xl p-3">
            <p className="text-xs font-medium text-zinc-500 mb-2">선택 현황</p>
            <div className="flex gap-2 flex-wrap">
              {selectedModel && (
                <span className="text-xs bg-white border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-700">
                  모델: {selectedModel.gender === 'female' ? '여성' : '남성'} {selectedModel.name}
                </span>
              )}
              {selectedTop && (
                <span className="text-xs bg-white border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-700">
                  상의: {selectedTop.color}
                </span>
              )}
              {selectedBottom && (
                <span className="text-xs bg-white border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-700">
                  하의: {selectedBottom.color}
                </span>
              )}
              {selectedShoes && (
                <span className="text-xs bg-white border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-700">
                  신발: {selectedShoes.color}
                </span>
              )}
            </div>
          </section>
        )}

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-zinc-100">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition ${
            canGenerate && !isGenerating
              ? 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              생성 중…
            </span>
          ) : canGenerate ? (
            '미리보기 생성'
          ) : (
            '모델 · 상의 · 하의 · 신발을 모두 선택하세요'
          )}
        </button>
      </div>
    </main>
  );
}
