import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api";
import { Star, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewFormInfo {
  tenantName: string;
  tenantSlug: string;
  primaryColor: string | null;
  clientName: string;
  serviceName: string;
  date: string;
  alreadySubmitted: boolean;
}

export default function ReviewPage() {
  const { token } = useParams();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const { data, isLoading, error } = useQuery<ReviewFormInfo>({
    queryKey: ["review-form", token],
    queryFn: () => apiGet<ReviewFormInfo>(`/reviews/submit/${token}`),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () => apiSend("POST", `/reviews/submit/${token}`, { rating, comment }),
    onSuccess: () => setDone(true),
  });

  const primary = data?.primaryColor || "#7D2535";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F5]">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F5] p-6 text-center text-stone-700">
        <p>Link inválido ou expirado.</p>
      </div>
    );
  }

  if (done || data?.alreadySubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F5] p-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: primary }}>
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Obrigada!</h1>
        <p className="text-stone-600 max-w-md">
          {data?.alreadySubmitted && !done
            ? "Você já enviou uma avaliação para este atendimento."
            : "Sua avaliação foi enviada. Ela será revisada e em breve poderá aparecer na página pública do salão."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3" style={{ background: `${primary}20`, color: primary }}>
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">Como foi seu atendimento?</h1>
          <p className="text-stone-500 mt-2">
            {data?.clientName}, você fez <strong>{data?.serviceName}</strong> em <strong>{data?.tenantName}</strong>.
          </p>
        </div>

        <div className="flex justify-center gap-1 sm:gap-2 my-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="transition-transform hover:scale-110 p-0.5"
              aria-label={`${i} estrelas`}
            >
              <Star
                className={`w-9 h-9 sm:w-12 sm:h-12 ${i <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-stone-300"}`}
              />
            </button>
          ))}
        </div>

        <textarea
          placeholder="Conte sua experiência (opcional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          className="w-full p-4 rounded-2xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-stone-700 resize-none mb-4"
          style={{ borderColor: "#e7e5e4" }}
        />

        <Button
          size="lg"
          className="w-full h-14 text-lg rounded-2xl"
          disabled={rating === 0 || submit.isPending}
          onClick={() => submit.mutate()}
          style={{ background: primary }}
        >
          {submit.isPending ? "Enviando..." : "Enviar avaliação"}
        </Button>

        {submit.isError && (
          <p className="text-red-600 text-sm text-center mt-3">
            Erro ao enviar. Tente novamente.
          </p>
        )}
      </div>
    </div>
  );
}
