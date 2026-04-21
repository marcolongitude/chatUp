package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"chatup/backend-go/internal/config"
	"chatup/backend-go/internal/httpserver"
	"chatup/backend-go/internal/platform/logger"
	"chatup/backend-go/internal/platform/pg"
	"chatup/backend-go/internal/ws"
)

func main() {
	cfg := config.Load()
	log := logger.New()
	ctx := context.Background()
	db, err := pg.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		panic(err)
	}
	defer db.Close()
	hub := ws.NewHub(log)
	router := httpserver.NewRouter(cfg, db, hub, log)
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Info("server started", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			panic(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		fmt.Println("shutdown error:", err)
	}
}
