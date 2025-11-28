'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  HelpCircle,
  Rocket,
  RefreshCw,
  Clock,
  Mail,
  FileText,
  Bell,
  Settings,
  Users,
  FolderKanban,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          Help & Documentatie
        </h1>
        <p className="text-muted-foreground mt-2">
          Welkom bij de Simplicate Automation Portal. Hier vind je uitleg over alle functionaliteiten.
        </p>
      </div>

      {/* Quick Start */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle>Aan de Slag</CardTitle>
          </div>
          <CardDescription>
            Volg deze stappen om te beginnen met het systeem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Synchroniseer data uit Simplicate</p>
                <p className="text-sm text-muted-foreground">
                  Ga naar <strong>Settings</strong> en klik op de sync knoppen voor Projecten, Medewerkers, Uren en Facturen.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Bekijk het Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Het dashboard toont een overzicht van alle projecten, uren en medewerkers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Gebruik de automation functies</p>
                <p className="text-sm text-muted-foreground">
                  Verstuur uren rapporten, herinneringen en beheer contracten via het Automation menu.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Documentation */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Handleidingen</h2>

        <Accordion type="single" collapsible className="space-y-2">
          {/* Data Synchroniseren */}
          <AccordionItem value="sync" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <span>Data Synchroniseren</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p>
                Het systeem haalt data op uit Simplicate. Dit moet regelmatig gesynchroniseerd worden om actuele informatie te hebben.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">Waar vind ik dit?</p>
                <p className="text-sm">Settings → Synchronisatie sectie</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Wat wordt gesynchroniseerd?</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li><strong>Projecten</strong> - Alle actieve projecten uit Simplicate</li>
                  <li><strong>Medewerkers</strong> - Teamleden en freelancers</li>
                  <li><strong>Uren</strong> - Geregistreerde uren per project</li>
                  <li><strong>Facturen</strong> - Verzonden facturen</li>
                  <li><strong>Services</strong> - Diensten met tarieven</li>
                </ul>
              </div>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Synchroniseer voordat je rapporten genereert om de nieuwste data te hebben.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Uren Rapporten */}
          <AccordionItem value="hours-reports" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-600" />
                <span>Uren Rapporten</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p>
                Genereer gedetailleerde uren rapporten voor freelancers en verstuur deze per e-mail.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">Waar vind ik dit?</p>
                <p className="text-sm">Automation → Hours Reports</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Hoe werkt het?</p>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Selecteer de maand waarvoor je een rapport wilt maken</li>
                  <li>Kies de medewerker uit de lijst</li>
                  <li>Bekijk het rapport preview met alle details</li>
                  <li>Klik op "Verstuur" om het rapport per e-mail te verzenden</li>
                </ol>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Wat staat er in het rapport?</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Uren per project met uurtarief en totaalbedrag</li>
                  <li>Kilometers registraties</li>
                  <li>Onkosten declaraties</li>
                  <li>Totaaloverzicht van alle bedragen</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Uren Herinneringen */}
          <AccordionItem value="hours-reminders" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-600" />
                <span>Uren Herinneringen</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p>
                Stuur automatische herinneringen naar medewerkers die hun uren nog niet hebben ingevuld.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">Waar vind ik dit?</p>
                <p className="text-sm">Automation → Hours Reminders</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Automatisch vs Handmatig</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li><strong>Automatisch:</strong> Elke maandag om 9:00 worden herinneringen verzonden</li>
                  <li><strong>Handmatig:</strong> Klik op "Verstuur Herinneringen" om direct te versturen</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Wie krijgt een herinnering?</p>
                <p className="text-sm text-muted-foreground">
                  Medewerkers die in de huidige week nog geen uren hebben geregistreerd en een e-mailadres hebben.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* E-mail Templates */}
          <AccordionItem value="templates" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <span>E-mail Templates</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p>
                Beheer de e-mail templates die gebruikt worden voor automatische berichten.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">Waar vind ik dit?</p>
                <p className="text-sm">Automation → Email Templates</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Template types</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li><strong>Contract Herinnering:</strong> Voor contract ondertekening</li>
                  <li><strong>Uren Herinnering:</strong> Voor het invullen van uren</li>
                  <li><strong>Aangepast:</strong> Vrij te configureren templates</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Variabelen gebruiken</p>
                <p className="text-sm text-muted-foreground">
                  Gebruik <code className="bg-muted px-1 rounded">{`{{variabele}}`}</code> in je template.
                  Bijvoorbeeld: <code className="bg-muted px-1 rounded">{`{{memberName}}`}</code> wordt vervangen door de naam van de ontvanger.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{`{{memberName}}`}</Badge>
                <Badge variant="secondary">{`{{projectName}}`}</Badge>
                <Badge variant="secondary">{`{{clientName}}`}</Badge>
                <Badge variant="secondary">{`{{uploadUrl}}`}</Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Contract Workflow */}
          <AccordionItem value="contracts" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-600" />
                <span>Contract Workflow</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p>
                Automatische distributie van contracten wanneer een medewerker aan een project wordt toegevoegd.
              </p>
              <div className="space-y-2">
                <p className="font-medium">Hoe werkt het?</p>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Een medewerker wordt aan een project gekoppeld in Simplicate</li>
                  <li>Het systeem ontvangt een webhook notificatie</li>
                  <li>Automatisch wordt een contract aangemaakt in de queue</li>
                  <li>De medewerker ontvangt een e-mail met upload link</li>
                  <li>Via de upload portal kan het ondertekende contract worden geüpload</li>
                </ol>
              </div>
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Let op:</strong> De webhook moet geconfigureerd zijn in Simplicate om dit te laten werken.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Verzonden E-mails */}
          <AccordionItem value="sent-emails" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-cyan-600" />
                <span>Verzonden E-mails</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <p>
                Bekijk een overzicht van alle verzonden e-mails en hun status.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">Waar vind ik dit?</p>
                <p className="text-sm">Automation → Sent Emails</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Status betekenis</p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 border-0">Verzonden</Badge>
                    <span className="text-sm text-muted-foreground">E-mail is succesvol afgeleverd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-100 text-yellow-700 border-0">Wachtend</Badge>
                    <span className="text-sm text-muted-foreground">E-mail wordt verwerkt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-700 border-0">Mislukt</Badge>
                    <span className="text-sm text-muted-foreground">Er is een fout opgetreden</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Separator />

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Veelgestelde Vragen</h2>

        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="faq-1" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-left">
              Waarom zie ik geen data in het dashboard?
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground">
                Waarschijnlijk is de data nog niet gesynchroniseerd. Ga naar <strong>Settings</strong> en klik op de sync knoppen
                om data uit Simplicate op te halen. Begin met Projecten, dan Medewerkers, en vervolgens Uren.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-2" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-left">
              Hoe vaak moet ik synchroniseren?
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground">
                Het is aan te raden om minimaal dagelijks te synchroniseren, of voordat je rapporten genereert.
                De sync knop rechtsboven in de header synchroniseert alle data in één keer.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-3" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-left">
              Wat gebeurt er als een e-mail mislukt?
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground">
                Je kunt de foutmelding zien bij <strong>Automation → Sent Emails</strong>.
                Vaak gaat het om een ongeldig e-mailadres of een tijdelijk probleem met de e-mailserver.
                Je kunt de actie opnieuw proberen.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-4" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-left">
              Kan ik de e-mail templates aanpassen?
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground">
                Ja! Ga naar <strong>Automation → Email Templates</strong>. Hier kun je bestaande templates bewerken
                of nieuwe templates aanmaken. Gebruik variabelen zoals {`{{memberName}}`} voor dynamische content.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-5" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-left">
              Waar vind ik de financiële overzichten?
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground">
                Het financiële dashboard vind je onder <strong>Dashboard</strong> (hoofdmenu) of via de URL <code>/admin/financials</code>.
                Hier zie je omzet, kosten en marges per project en per medewerker.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hulp Nodig?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Kom je er niet uit? Neem contact op met de beheerder of bekijk de logs onder{' '}
            <strong>Automation → Logs & Queue</strong> voor technische details.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
